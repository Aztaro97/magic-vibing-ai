import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	server: {
		NODE_ENV: z.enum(["development", "production"]).optional(),
		// LLM API keys — only the key matching MODEL_PROVIDER is required at runtime.
		// All are optional at validation time; buildModel() throws if the needed key is missing.
		ANTHROPIC_API_KEY: z.string().min(1).optional(),
		OPENAI_API_KEY: z.string().min(1).optional(),
		GEMINI_API_KEY: z.string().min(1).optional(),
		MOONSHOT_API_KEY: z.string().min(1).optional(),
		POSTGRES_URL: z.string(),
		TAVILY_API_KEY: z.string().min(1),
		E2B_API_KEY: z.string().min(1).optional(),
		DAYTONA_API_KEY: z.string().min(1).optional(),
		AGENT_MODEL: z.string().optional().default("qwen3.5"),
		AGENT_SUBAGENT_MODEL: z.string().optional().default("qwen3.5"),
		LANGCHAIN_TRACING_V2: z.string().optional().default("true"),
		LANGCHAIN_ENDPOINT: z
			.string()
			.optional()
			.default("https://api.smith.langchain.com"),
		LANGCHAIN_API_KEY: z.string().optional(),
		LANGCHAIN_PROJECT: z.string().optional().default("vibecoding"),
		NGROK_AUTHTOKEN: z.string().optional(),

		MODEL_PROVIDER: z.enum(["anthropic", "openai", "google", "moonshot", "ollama"]).optional().default("ollama"),
	},
	client: {},
	experimental__runtimeEnv: {},
	skipValidation:
		!!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
