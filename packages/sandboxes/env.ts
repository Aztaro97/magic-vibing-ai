import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		NODE_ENV: z.enum(["development", "production"]).optional(),
		ANTHROPIC_API_KEY: z.string().min(1),
		OPENAI_API_KEY: z.string().min(1),
		GEMINI_API_KEY: z.string().min(1),
		POSTGRES_URL: z.string(),
		E2B_API_KEY: z.string().min(1).optional(),
		SANDBOX_TIMEOUT_SECONDS: z.string().optional().default("300"),
		DAYTONA_API_KEY: z.string().min(1).optional(),
		DAYTONA_AUTO_STOP_INTERVAL: z.string().optional().default("15"),
		DAYTONA_DEFAULT_IMAGE: z.string().optional().default("node:20"),
		DAYTONA_TARGET: z.enum(["us", "eu"]).optional().default("us"),
		AGENT_LOG_LEVEL: z.string().optional(),
		SANDBOX_MAX_CONCURRENT_PER_USER: z.string().optional().default("5"),
		NGROK_AUTHTOKEN: z.string().min(1).optional(),

		LANGCHAIN_TRACING_V2: z.string().optional().default("true"),
		LANGCHAIN_ENDPOINT: z
			.string()
			.optional()
			.default("https://api.smith.langchain.com"),
		LANGCHAIN_API_KEY: z.string().optional(),
		LANGCHAIN_PROJECT: z.string().optional().default("vibecoding"),
	},
	client: {},
	experimental__runtimeEnv: {},
	skipValidation:
		!!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
