import type { BaseSandbox, DeepAgent } from "deepagents";
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

function buildModel() {
	switch (env.MODEL_PROVIDER) {
		case "google":
			return googleGeminiModel({ modelName: "gemini-2.5-pro-preview-05-06" });
		case "anthropic":
			return anthropicModel({ modelName: "claude-opus-4-5" });
		case "moonshot":
			return moonshotModel({ modelName: "moonshot-v1-8k" });
		case "openai":
			return openaiModel({ modelName: "gpt-4o" });
		case "ollama":
			return ollamaModel({ modelName: "llama3" });
		default:
			throw new Error("Invalid MODEL_PROVIDER");
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
): DeepAgent {
	const { sandbox } = options;

	return createDeepAgent({
		model: buildModel(),
		systemPrompt: SUPERVISOR_PROMPT,
		subagents: ALL_SUBAGENTS,
		skills: ["/.deepagents/skills"],
		memory: ["/.deepagents/AGENTS.md"],
		backend: sandbox ?? ((config) => new StoreBackend(config)),
		store: getStore(),
		checkpointer: getCheckpointer(),
	}) as any as DeepAgent;
}

export type { DeepAgent };
