
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { generateSlug } from "random-word-slugs";
import { z } from "zod";

import { and, asc, db, eq, message, project } from "@acme/db";

import { protectedProcedure } from "../trpc";

export const projectRouter = {
	create: protectedProcedure
		.input(
			z.object({
				value: z.string().min(1).max(1000),
				model: z.string().default("claude-opus-4-0"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const result = await db.transaction(async (tx) => {
				// Create the project
				const [createdProject] = await tx
					.insert(project)
					.values({
						userId: ctx.session.user.id,
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

				// Persist the initial USER message so the project page can show it
				// immediately without waiting for the agent to respond.
				await tx.insert(message).values({
					content: input.value,
					role: "USER",
					type: "RESULT",
					projectId: createdProject.id,
				});

				return createdProject;
			});

			// Return the project AND the original prompt so the client can pass it
			// through the URL and auto-trigger the first agent message.
			return {
				...result,
				initialPrompt: input.value,
			};
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