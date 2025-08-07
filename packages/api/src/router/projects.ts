import type { TRPCRouterRecord } from "@trpc/server";
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
      //   inngestClient.send({
      //     name: "hello-word-fn",
      //     data: {
      //       value: input.message,
      //     },
      //   });

      console.log("value ", input.value);

      return {
        id: "1",
      };
    }),
  getMany: protectedProcedure.query(async ({ ctx }) => {
    return {
      message: "Projects fetched",
    };
  }),
} satisfies TRPCRouterRecord;
