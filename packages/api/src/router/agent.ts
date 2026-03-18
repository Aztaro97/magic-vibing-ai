// packages/api/src/routers/agent.ts
import { tracked, TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@acme/db";
import type { NewAgentSession } from "@acme/db/agents";
import {
	agentEvent as agentEventTable,
	agentSession,
	agentTodo,
} from "@acme/db/schema";
import type { AgentEvent } from "@acme/deep-agents";
import {
	buildThreadId,
	createMagicVibingAgent,
	transformAgentStream,
} from "@acme/deep-agents";
import { resolveSandbox } from "@acme/sandboxes/router";

import { createTRPCRouter, protectedProcedure } from "../trpc";

// ─────────────────────────────────────────
// Input validators
// ─────────────────────────────────────────

const RunAgentInputSchema = z.object({
	projectId: z.string().uuid(),
	sessionId: z.string().uuid(),
	userMessage: z.string().min(1).max(32_000),
	sandboxProvider: z.enum(["e2b", "daytona"]).optional(),
	/** Supply when resuming after a HITL pause */
	hitlDecision: z
		.object({
			decision: z.enum(["approve", "edit", "reject"]),
			editedInput: z.unknown().optional(),
			reason: z.string().optional(),
		})
		.optional(),
	/** SSE resume: the last event seq the client received */
	lastEventId: z.coerce.number().optional(),
});

const SessionQuerySchema = z.object({
	projectId: z.string().uuid(),
	limit: z.number().int().min(1).max(100).default(20),
	cursor: z.string().uuid().optional(),
});

// ─────────────────────────────────────────
// Router
// ─────────────────────────────────────────

export const agentRouter = createTRPCRouter({
	// ── agent.run ──────────────────────────────────────────────────────────────
	//
	// SSE subscription — yields a stream of AgentEvent objects to the client.
	//
	// Client usage:
	//   const sub = trpc.agent.run.useSubscription(
	//     { projectId, sessionId, userMessage },
	//     { onData: (event) => dispatch(event), onError: console.error }
	//   );
	//
	run: protectedProcedure
		.input(RunAgentInputSchema)
		.subscription(async function* ({ input, ctx, signal }) {
			const { user } = ctx.session;
			const {
				projectId,
				sessionId,
				userMessage,
				sandboxProvider,
				hitlDecision,
				lastEventId,
			} = input;

			// ── Resolve or create the agent session row ───────────────────────────
			let session = await db.query.agentSession.findFirst({
				where: and(
					eq(agentSession.id, sessionId),
					eq(agentSession.userId, user.id),
				),
			});

			const threadId = buildThreadId({ projectId, sessionId });

			if (!session) {
				const newSession: NewAgentSession = {
					id: sessionId,
					projectId,
					userId: user.id,
					threadId,
					initialPrompt: userMessage,
					status: "running",
					sandboxProvider,
				};
				[session] = await db
					.insert(agentSession)
					.values(newSession)
					.returning();
			} else {
				// Resuming — mark running again
				await db
					.update(agentSession)
					.set({ status: "running", updatedAt: new Date() })
					.where(eq(agentSession.id, sessionId));
			}

			if (!session) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create agent session",
				});
			}

			// ── Replay missed events if client reconnects with lastEventId ────────
			if (lastEventId !== undefined) {
				const missed = await db
					.select()
					.from(agentEventTable)
					.where(
						and(
							eq(agentEventTable.sessionId, sessionId),
							// seq > lastEventId
						),
					)
					.orderBy(agentEventTable.seq)
					.limit(500);

				for (const row of missed) {
					yield tracked(String(row.seq), row.data as AgentEvent);
				}
			}

			// ── Acquire sandbox ───────────────────────────────────────────────────
			const startedAt = Date.now();
			const sandbox = await resolveSandbox({
				provider: sandboxProvider,
				projectId,
				sessionId,
				existingId: session.sandboxId ?? undefined,
			});

			if (sandbox?.id) {
				await db
					.update(agentSession)
					.set({ sandboxId: sandbox.id, sandboxProvider: sandbox.provider })
					.where(eq(agentSession.id, sessionId));
			}

			// ── Build the compiled graph ──────────────────────────────────────────
			const agent = createMagicVibingAgent({ sandbox: sandbox?.instance });

			// ── Stream agent events ───────────────────────────────────────────────
			let seq = lastEventId ?? 0;

			try {
				const messages = hitlDecision
					? // HITL resume: inject the human decision as a tool approval
					[{ role: "tool" as const, content: JSON.stringify(hitlDecision) }]
					: [{ role: "user" as const, content: userMessage }];

				const rawStream = agent.streamEvents(
					{ messages },
					{
						version: "v2",
						configurable: { thread_id: threadId },
						signal,
					},
				);

				for await (const agentEvent of transformAgentStream(rawStream)) {
					seq++;

					// Persist to DB (fire-and-forget — don't await in the hot path)
					db.insert(agentEventTable)
						.values({
							sessionId,
							type: agentEvent.type as never,
							data: agentEvent.data as Record<string, unknown>,
							seq,
						})
						.catch((err) =>
							console.error("[agent.run] event persist failed", err),
						);

					// Update todo list snapshot when agent updates todos
					if (agentEvent.type === "todo_update") {
						const todos = (
							agentEvent.data as {
								todos: Array<{
									id: string;
									text: string;
									done: boolean;
									priority: string;
								}>;
							}
						).todos;
						void syncTodos(sessionId, todos);
					}

					// Pause DB row on HITL
					if (agentEvent.type === "hitl_pause") {
						await db
							.update(agentSession)
							.set({ status: "paused", updatedAt: new Date() })
							.where(eq(agentSession.id, sessionId));
					}

					// Yield to the SSE stream with a tracked ID for reconnect support
					yield tracked(String(seq), agentEvent);

					// Check if the HTTP connection was aborted (user navigated away)
					if (signal?.aborted) break;
				}

				// ── Finalize ────────────────────────────────────────────────────────
				const durationMs = Date.now() - startedAt;
				await db
					.update(agentSession)
					.set({ status: "done", durationMs, updatedAt: new Date() })
					.where(eq(agentSession.id, sessionId));

				const doneEvent: AgentEvent = {
					type: "done",
					ts: new Date().toISOString(),
					data: { summary: "Agent run complete.", durationMs },
				};

				seq++;
				yield tracked(String(seq), doneEvent);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Unknown agent error";

				await db
					.update(agentSession)
					.set({ status: "error", updatedAt: new Date() })
					.where(eq(agentSession.id, sessionId));

				const errorEvent: AgentEvent = {
					type: "error",
					ts: new Date().toISOString(),
					data: { message },
				};

				seq++;
				yield tracked(String(seq), errorEvent);
			} finally {
				// Close sandbox if it was ephemeral (E2B auto-terminates; Daytona needs explicit stop)
				if (sandbox?.shouldClose) {
					sandbox.instance.close().catch(console.error);
				}
			}
		}),

	// ── agent.listSessions ────────────────────────────────────────────────────
	listSessions: protectedProcedure
		.input(SessionQuerySchema)
		.query(async ({ input, ctx }) => {
			const { projectId, limit, cursor } = input;
			const { user } = ctx.session;

			const sessions = await db.query.agentSession.findMany({
				where: and(
					eq(agentSession.projectId, projectId),
					eq(agentSession.userId, user.id),
				),
				orderBy: [desc(agentSession.createdAt)],
				limit: limit + 1,
				with: { todos: true },
			});

			const hasMore = sessions.length > limit;
			const items = hasMore ? sessions.slice(0, -1) : sessions;

			return {
				items,
				nextCursor: hasMore ? items.at(-1)?.id : undefined,
			};
		}),

	// ── agent.getSession ──────────────────────────────────────────────────────
	getSession: protectedProcedure
		.input(z.object({ sessionId: z.string().uuid() }))
		.query(async ({ input, ctx }) => {
			const { user } = ctx.session;

			const session = await db.query.agentSession.findFirst({
				where: and(
					eq(agentSession.id, input.sessionId),
					eq(agentSession.userId, user.id),
				),
				with: {
					todos: true,
					events: { orderBy: [desc(agentEventTable.seq)], limit: 100 },
				},
			});

			if (!session) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Session not found",
				});
			}

			return session;
		}),

	// ── agent.cancelSession ───────────────────────────────────────────────────
	cancelSession: protectedProcedure
		.input(z.object({ sessionId: z.string().uuid() }))
		.mutation(async ({ input, ctx }) => {
			const { user } = ctx.session;

			const session = await db.query.agentSession.findFirst({
				where: and(
					eq(agentSession.id, input.sessionId),
					eq(agentSession.userId, user.id),
				),
			});

			if (!session) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Session not found",
				});
			}

			await db
				.update(agentSession)
				.set({ status: "error", updatedAt: new Date() })
				.where(eq(agentSession.id, input.sessionId));

			return { ok: true };
		}),

	// ── agent.resolveHitl ─────────────────────────────────────────────────────
	// Client calls this to resume a paused session after HITL approval/rejection.
	// The resolution is injected as the userMessage in the next .run() call.
	resolveHitl: protectedProcedure
		.input(
			z.object({
				sessionId: z.string().uuid(),
				decision: z.enum(["approve", "edit", "reject"]),
				editedInput: z.unknown().optional(),
				reason: z.string().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const { user } = ctx.session;

			const session = await db.query.agentSession.findFirst({
				where: and(
					eq(agentSession.id, input.sessionId),
					eq(agentSession.userId, user.id),
					eq(agentSession.status, "paused"),
				),
			});

			if (!session) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No paused session found with that ID",
				});
			}

			// Mark ready-to-resume — the client should then call agent.run with hitlDecision
			await db
				.update(agentSession)
				.set({ status: "running", updatedAt: new Date() })
				.where(eq(agentSession.id, input.sessionId));

			return {
				sessionId: input.sessionId,
				threadId: session.threadId,
				decision: input.decision,
			};
		}),
});

// ─────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────

async function syncTodos(
	sessionId: string,
	todos: Array<{ id: string; text: string; done: boolean; priority: string }>,
) {
	// Delete the old snapshot and replace with the new one in a transaction
	await db.transaction(async (tx) => {
		await tx.delete(agentTodo).where(eq(agentTodo.sessionId, sessionId));
		if (todos.length > 0) {
			await tx.insert(agentTodo).values(
				todos.map((t, i) => ({
					sessionId,
					text: t.text,
					done: String(t.done),
					priority: t.priority,
					order: i,
				})),
			);
		}
	});
}
