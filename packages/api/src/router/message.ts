import { and, db, eq, message, project } from "@acme/db";
import { inngestClient } from "@acme/jobs";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "../trpc";


export const messageRouter = {
	getMany: protectedProcedure
		.input(
			z.object({
				projectId: z.string().min(1, { message: "Project Id is required" }),
			})
		)
		.query(async ({ input, ctx }) => {
			// First verify the project belongs to the user
			const userProject = await db
				.select()
				.from(project)
				.where(
					and(
						eq(project.id, input.projectId),
						eq(project.userId, ctx.session.user.id)
					)
				)
				.limit(1);

			if (userProject.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project not found or access denied",
				});
			}

			// Query messages with fragment relation
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
				value: z
					.string()
					.min(1, { message: "Prompt is required" })
					.max(1000, { message: "Prompt is too long" }),
				projectId: z.string().min(1, { message: "Project Id is required" }),
			})
		)
		.mutation(async ({ input, ctx }) => {


			// Verify project exists and belongs to user
			const existingProject = await db
				.select()
				.from(project)
				.where(
					and(
						eq(project.id, input.projectId),
						eq(project.userId, ctx.session.user.id)
					)
				)
				.limit(1);

			if (existingProject.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Project Not Found",
				});
			}

			// Create the message
			const [createdMessage] = await db
				.insert(message)
				.values({
					projectId: input.projectId,
					content: input.value,
					role: "USER",
					type: "RESULT",
				})
				.returning();

			if (!createdMessage) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create message",
				});
			}

			// Send to Inngest for processing
			await inngestClient.send({
				name: "code-agent/run",
				data: {
					value: input.value,
					projectId: input.projectId,

				},
			});

			return createdMessage;
		}),

} satisfies TRPCRouterRecord;
