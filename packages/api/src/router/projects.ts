import { Client } from "@langchain/langgraph-sdk";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import * as jose from "jose";
import { generateSlug } from "random-word-slugs";
import { z } from "zod";

import { and, asc, db, eq, message, project } from "@acme/db";
import { protectedProcedure } from "../trpc";

// ─────────────────────────────────────────────────────────────────────────────
// Shared config (keep in sync with packages/agents/src/auth.ts)
// ─────────────────────────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(
	process.env.AUTH_SECRET ?? "missing-auth-secret"
);

const LANGGRAPH_SERVER_URL =
	process.env.LANGGRAPH_SERVER_URL ?? "http://localhost:2024";

/**
 * Mint a 60-second service JWT so the tRPC router can call the LangGraph
 * server to pre-create a thread. The auth.ts handler recognises sub="service"
 * and grants thread-creation rights.
 */
async function mintServiceToken(projectId: string, userId: string) {
	return new jose.SignJWT({ sub: "service", projectId, userId })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setIssuer("magic-vibing-ai")
		.setAudience("langgraph-agent-server")
		.setExpirationTime("60s")
		.sign(JWT_SECRET);
}

/**
 * Pre-create the LangGraph thread with thread_id = projectId.
 * Uses a service JWT — not tied to any user request/cookie.
 * Fails silently so the project is still created even if LangGraph is down.
 */
async function ensureLangGraphThread(projectId: string, userId: string, description: string) {
	try {
		const svcToken = await mintServiceToken(projectId, userId);
		const client = new Client({
			apiUrl: LANGGRAPH_SERVER_URL,
			defaultHeaders: { Authorization: `Bearer ${svcToken}` },
		});

		await client.threads.create({
			threadId: projectId,
			metadata: {
				projectId,
				userId,
				description,
			},
		});
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		// "already exists" is fine — silently ignore it
		if (!msg.includes("already exists") && !msg.includes("409")) {
			console.warn("[projects.create] LangGraph thread pre-create failed:", msg);
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const projectRouter = {
	create: protectedProcedure
		.input(
			z.object({
				value: z.string().min(1).max(1000),
				model: z.string().default("claude-opus-4-0"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const sessionId = ctx.session.session.id;

			// 1. Create project + first USER message in a single transaction
			const result = await db.transaction(async (tx) => {
				const [createdProject] = await tx
					.insert(project)
					.values({
						userId,
						name: generateSlug(2, { format: "kebab" }),
						model: input.model,
					})
					.returning();

				if (!createdProject) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create project",
					});
				}

				// This message is the source-of-truth for the initial prompt.
				// AgentPanel reads it from DB on load instead of needing URL params.
				await tx.insert(message).values({
					content: input.value,
					role: "USER",
					type: "RESULT",
					projectId: createdProject.id,
				});

				return createdProject;
			});

			// 2. Pre-create the LangGraph thread with thread_id = projectId (async)
			//    Fire-and-forget is intentional — project creation succeeds regardless.
			//    The token route has a safety-net creation too.
			void ensureLangGraphThread(result.id, sessionId, input.value);

			// 3. Return just the project id. Navigation: /project/{id} — no params.
			return result;
		}),

	getOne: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.query(async ({ input, ctx }) => {
			const [existingProject] = await db
				.select()
				.from(project)
				.where(
					and(
						eq(project.id, input.id),
						eq(project.userId, ctx.session.user.id),
					),
				)
				.limit(1);

			if (!existingProject) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
			}

			return existingProject;
		}),

	getMany: protectedProcedure.query(async ({ ctx }) => {
		const projects = await db
			.select()
			.from(project)
			.where(eq(project.userId, ctx.session.user.id))
			.orderBy(asc(project.updatedAt));
		return projects;
	}),
} satisfies TRPCRouterRecord;