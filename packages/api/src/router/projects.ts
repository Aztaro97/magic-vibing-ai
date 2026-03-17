import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { generateSlug } from "random-word-slugs";
import { z } from "zod";

import { runCodeAgentGraph } from "@acme/agents";
import { and, asc, db, eq, message, project } from "@acme/db";

import { protectedProcedure } from "../trpc";

export const projectRouter = {
  create: protectedProcedure
    .input(
      z.object({
        value: z.string(),
        model: z.string().default("claude-opus-4-0"),
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
            model: input.model,
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

      console.log("Calling LangGraph agent: " + input.value);

      // Trigger LangGraph agent execution (async, don't await)
      const runId = crypto.randomUUID();
      runCodeAgentGraph({
        projectId: result.id,
        userId: ctx.session.user.id,
        runId,
        userPrompt: input.value,
        modelProvider: input.model.includes("claude") ? "anthropic" : "openai",
        template: "expo",
      }).catch((error: unknown) => {
        console.error("[api] LangGraph agent failed:", error);
      });

      return result;
    }),
  getOne: protectedProcedure
    .input(z.object({ id: z.string().min(1, { message: "Id is required" }) }))
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
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
