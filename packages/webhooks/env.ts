import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		E2B_API_KEY: z.string().min(1).optional(),
		E2B_WEBHOOK_SECRET: z.string().min(1).optional(),
	},
	client: {},
	experimental__runtimeEnv: {},
	skipValidation:
		!!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
