import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { runCodeAgentGraph } from "@acme/agents";
import { and, db, eq, message, project } from "@acme/db";

import { protectedProcedure } from "../trpc";

export const messageRouter = {
  getMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, { message: "Project Id is required" }),
      }),
    )
    .query(async ({ input, ctx }) => {
      // First verify the project belongs to the user
      const userProject = await db
        .select()
        .from(project)
        .where(
          and(
            eq(project.id, input.projectId),
            eq(project.userId, ctx.session.user.id),
          ),
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
        model: z.string().min(1, { message: "Model is required" }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Verify project exists and belongs to user
      const existingProject = await db
        .select()
        .from(project)
        .where(
          and(
            eq(project.id, input.projectId),
            eq(project.userId, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (existingProject.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project Not Found",
        });
      }

      // UPDATE PROJECT MODEL IF IT'S NOT THE SAME
      if (existingProject[0]?.model !== input.model) {
        await db
          .update(project)
          .set({ model: input.model })
          .where(eq(project.id, input.projectId));
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

      // Trigger LangGraph agent execution (async, don't await)
      const runId = crypto.randomUUID();
      runCodeAgentGraph({
        projectId: input.projectId,
        userId: ctx.session.user.id,
        runId,
        userPrompt: input.value,
        modelProvider: input.model.includes("claude") ? "anthropic" : "openai",
        template: "expo",
      }).catch((error: unknown) => {
        console.error("[api] LangGraph agent failed:", error);
      });

      return createdMessage;
    }),
} satisfies TRPCRouterRecord;
