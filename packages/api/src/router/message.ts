import type { TRPCRouterRecord } from "@trpc/server";

import { z } from "zod";
import { protectedProcedure } from "../trpc";


export const messageRouter = {
	getMany: protectedProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx }) => {
		return {
			message: "Messages fetched",
		};
	}),
	create: protectedProcedure.input(z.object({ projectId: z.string(), value: z.string() })).mutation(async ({ ctx }) => {
		return {
			message: "Message created",
		};
	}),

} satisfies TRPCRouterRecord;
