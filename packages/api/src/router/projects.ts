import { db, message, project } from "@acme/db";
import { inngestClient } from "@acme/jobs";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { generateSlug } from "random-word-slugs";
import { z } from "zod";
import { protectedProcedure } from "../trpc";


export const projectRouter = {
	create: protectedProcedure
		.input(
			z.object({
				value: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			console.log("Creating project: " + input.value);


			// Create project and message in a transaction
			const result = await db.transaction(async (tx) => {
				// Create the project
				const [createdProject] = await tx
					.insert(project)
					.values({
						userId: ctx.session.user.id,
						name: generateSlug(2, {
							format: "kebab",
						}),
					})
					.returning();

				if (!createdProject) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create project",
					});
				}

				// Create the initial message
				await tx.insert(message).values({
					content: input.value,
					role: "USER",
					type: "RESULT",
					projectId: createdProject.id,
				});

				return createdProject;
			});

			console.log("Calling Inngest: " + input.value);
			await inngestClient.send({
				name: "code-agent/run",
				data: {
					value: input.value,
					projectId: result.id,
				},
			});

			return result;
		}),
	getMany: protectedProcedure.input(z.object({ projectId: z.string() })).query(({ input: _input }) => {
		return true
	}),
	getOne: protectedProcedure.input(z.object({ id: z.string() })).query(({ input: _input }) => {
		return {
			message: "Project fetched",
		};
	}),
} satisfies TRPCRouterRecord;
