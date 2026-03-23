import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, db, eq, message, project } from "@acme/db";

import { protectedProcedure } from "../trpc";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify the project exists and belongs to the current user.
 * Throws NOT_FOUND when the project doesn't exist or isn't owned by `userId`.
 */
async function verifyProjectOwnership(projectId: string, userId: string) {
	const [existingProject] = await db
		.select()
		.from(project)
		.where(
			and(
				eq(project.id, projectId),
				eq(project.userId, userId),
			),
		)
		.limit(1);

	if (!existingProject) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Project not found",
		});
	}

	return existingProject;
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const messageRouter = {
	getMany: protectedProcedure
		.input(
			z.object({
				projectId: z.string().min(1, { message: "Project Id is required" }),
			}),
		)
		.query(async ({ input, ctx }) => {
			await verifyProjectOwnership(input.projectId, ctx.session.user.id);

			const messages = await db.query.message.findMany({
				where: eq(message.projectId, input.projectId),
				with: {
					fragment: true,
				},
				orderBy: message.updatedAt,
			});

			return messages;
		}),

	create: protectedProcedure
		.input(
			z.object({
				value: z.string().min(1, { message: "Prompt is required" }).max(1000, { message: "Prompt is too long" }),
				projectId: z.string().min(1, { message: "Project Id is required" }),
				model: z.string().min(1, { message: "Model is required" }),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const userId = ctx.session.user.id;
			const existingProject = await verifyProjectOwnership(input.projectId, userId);

			// Wrap model-update + message-insert in a single transaction
			const createdMessage = await db.transaction(async (tx) => {
				// Update project model if it changed
				if (existingProject.model !== input.model) {
					await tx
						.update(project)
						.set({ model: input.model })
						.where(eq(project.id, input.projectId));
				}

				const [msg] = await tx
					.insert(message)
					.values({
						projectId: input.projectId,
						content: input.value,
						role: "USER",
						type: "RESULT",
					})
					.returning();

				if (!msg) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create message",
					});
				}

				return msg;
			});

			// The LangGraph agent run is triggered client-side via useStream.submit()
			// — no server-side fire-and-forget needed here.

			return createdMessage;
		}),
} satisfies TRPCRouterRecord;
