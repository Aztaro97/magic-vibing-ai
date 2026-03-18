import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { db, llmKey } from "@acme/db";

import { protectedProcedure } from "../trpc";

export const llmRouter = {
  update: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["openai", "anthropic", "gemini"]),
        model: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { session } = ctx;
      if (!session.user?.id) {
        throw new Error("Unauthorized");
      }

      const [row] = await db
        .insert(llmKey)
        .values({
          provider: input.provider,
          model: input.model,
          userId: session.user.id,
        })
        .returning();

      return row;
    }),
} satisfies TRPCRouterRecord;
