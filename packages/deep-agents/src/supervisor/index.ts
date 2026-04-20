import type { BaseSandbox } from "deepagents";
import { createDeepAgent, StoreBackend } from "deepagents";

import { env } from "../../env";
import { getCheckpointer, getStore } from "../memory";
import { anthropicModel } from "../models/anthropic-model";
import { googleGeminiModel } from "../models/gemini-model";
import { moonshotModel } from "../models/moonshot-model";
import { ollamaModel } from "../models/ollama-model";
import { openaiModel } from "../models/openai-model";
import { SUPERVISOR_PROMPT } from "../prompts";
import { ALL_SUBAGENTS } from "../subagents";


// ─────────────────────────────────────────
// Dangerous command patterns for HITL
// ─────────────────────────────────────────

/**
 * Only these patterns trigger HITL interrupts on the `execute` tool.
 * Everything else (typecheck, lint, test, ls, cat, etc.) runs freely.
 */
const DANGEROUS_COMMAND_PATTERNS = [
	/\brm\s+-rf?\s/i,
	/\bgit\s+push\s+--force/i,
	/\bgit\s+push\s+-f\b/i,
	/\bgit\s+reset\s+--hard/i,
	/\bnpm\s+publish\b/i,
	/\bpnpm\s+publish\b/i,
	/\byarn\s+publish\b/i,
	/\bdrop\s+(table|database)\b/i,
	/\btruncate\s+table\b/i,
	/\bcurl\b.*\|\s*sh\b/i,
	/\bcurl\b.*\|\s*bash\b/i,
];

function isDangerousCommand(input: unknown): boolean {
	if (!input || typeof input !== "object") return false;
	const command = (input as Record<string, unknown>).command;
	if (typeof command !== "string") return false;
	return DANGEROUS_COMMAND_PATTERNS.some((p) => p.test(command));
}

// ─────────────────────────────────────────
// Model
// ─────────────────────────────────────────

/** Default model names per provider — overridden by env.AGENT_MODEL when set. */
const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
	google: "gemini-3.1-pro-preview",
	anthropic: "claude-sonnet-4-6",
	moonshot: "kimi-k2.5",
	openai: "gpt-5.4",
	ollama: "Kimi-K2.5",
};

function assertApiKey(key: string | undefined, provider: string): string {
	if (!key) {
		throw new Error(
			`${provider.toUpperCase()} API key is required when MODEL_PROVIDER="${provider}". ` +
			`Set the corresponding env var in your .env file.`,
		);
	}
	return key;
}

function buildModel() {
	const provider = env.MODEL_PROVIDER;
	// Use AGENT_MODEL env var if it differs from the default "qwen3.5" fallback,
	// otherwise use the provider-specific default.
	const isCustomModel = env.AGENT_MODEL && env.AGENT_MODEL !== "qwen3.5";
	const modelName = isCustomModel ? env.AGENT_MODEL : PROVIDER_DEFAULT_MODELS[provider];

	if (!modelName) {
		throw new Error(`No default model configured for MODEL_PROVIDER="${provider}"`);
	}

	switch (provider) {
		case "google":
			assertApiKey(env.GEMINI_API_KEY, "google");
			return googleGeminiModel({ modelName: modelName as Parameters<typeof googleGeminiModel>[0]["modelName"] });
		case "anthropic":
			assertApiKey(env.ANTHROPIC_API_KEY, "anthropic");
			return anthropicModel({ modelName: modelName as Parameters<typeof anthropicModel>[0]["modelName"] });
		case "moonshot":
			assertApiKey(env.MOONSHOT_API_KEY, "moonshot");
			return moonshotModel({ modelName: modelName as Parameters<typeof moonshotModel>[0]["modelName"] });
		case "openai":
			assertApiKey(env.OPENAI_API_KEY, "openai");
			return openaiModel({ modelName: modelName as Parameters<typeof openaiModel>[0]["modelName"] });
		case "ollama":
			return ollamaModel({ modelName: modelName as Parameters<typeof ollamaModel>[0]["modelName"] });
		default:
			throw new Error(`Invalid MODEL_PROVIDER: "${provider}"`);
	}
}

// ─────────────────────────────────────────
// Supervisor factory
// ─────────────────────────────────────────

export interface SupervisorOptions {
	sandbox?: BaseSandbox;
}

export function createMagicVibingAgent(
	options: SupervisorOptions = {},
) {
	const { sandbox } = options;

	return createDeepAgent({
		model: buildModel(),
		systemPrompt: SUPERVISOR_PROMPT,
		subagents: ALL_SUBAGENTS,
		skills: ["/home/user/app/.deepagents/skills"],
		memory: ["/home/user/app/.deepagents/AGENTS.md"],
		backend: sandbox ?? ((config) => new StoreBackend(config)),
		store: getStore(),
		checkpointer: getCheckpointer(),
	});
}
