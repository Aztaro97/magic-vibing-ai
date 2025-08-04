import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { inngestClient } from "@acme/jobs";

import { protectedProcedure } from "../trpc";

export const messageRouter = {
  create: protectedProcedure
    .input(
      z.object({
        message: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      inngestClient.send({
        name: "hello-word-fn",
        data: {
          value: input.message,
        },
      });

      return {
        message: "Message sent",
      };
    }),
} satisfies TRPCRouterRecord;
