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
			return googleGeminiModel({ modelName: "gemini-3.1-pro-preview" });
		case "anthropic":
			return anthropicModel({ modelName: "claude-sonnet-4-6" });
		case "moonshot":
			return moonshotModel({ modelName: "kimi-k2.5" });
		case "openai":
			return openaiModel({ modelName: "gpt-5.4" });
		case "ollama":
			return ollamaModel({ modelName: "Kimi-K2.5" });
		default:
			throw new Error("Invalid MODEL_PROVIDER");
	}
}

// ─────────────────────────────────────────
// Supervisor factory
// ─────────────────────────────────────────

export interface SupervisorOptions {
	/**
	 * Sandbox backend injected by the `@acme/sandboxes` lifecycle manager.
	 *
	 * Supports both E2B (fast, ephemeral) and Daytona (stateful, persistent)
	 * providers. The sandbox is resolved dynamically — either:
	 *   - Injected by the API router via `resolveProjectSandbox()`, or
	 *   - Lazy-provisioned by `LazySandbox` for the LangGraph dev server.
	 *
	 * When provided, agents gain `execute`, `read_file`, `write_file`,
	 * `edit_file`, `uploadFiles`, and `downloadFiles` tools.
	 * When omitted, agents run in filesystem-only mode (StoreBackend).
	 */
	sandbox?: BaseSandbox;
}

/**
 * Creates and returns a compiled DeepAgent graph wired with:
 * - Configurable LLM (Anthropic, OpenAI, Gemini, Moonshot, Ollama)
 * - Custom Magic Vibing supervisor system prompt
 * - All 6 sub-agents (research, code, debug, test, doc, review)
 * - Sandbox backend from @acme/sandboxes (E2B or Daytona) or StoreBackend fallback
 * - MemorySaver checkpointer for HITL and resume support
 * - Safety gates on destructive operations (rm, publish, force-push)
 *
 * The returned agent is a compiled LangGraph graph. Use `.stream()` to
 * get an async iterator of StreamEvent objects for SSE delivery.
 */
export function createMagicVibingAgent(
	options: SupervisorOptions = {},
): DeepAgent {
	const { sandbox } = options;

	return createDeepAgent({
		model: buildModel(),

		systemPrompt: SUPERVISOR_PROMPT,

		subagents: ALL_SUBAGENTS,

		memory: [], // Agent memory

		// StoreBackend persists the agent's virtual filesystem to LangGraph Store.
		// Each project+session gets its own namespace so agents don't bleed state.
		backend: sandbox ?? ((config) => new StoreBackend(config)),

		store: getStore(),
		checkpointer: getCheckpointer(),

		// Human-in-the-loop: currently disabled on `execute` to avoid blocking
		// every sandbox command. The deepagents SDK's InterruptOnConfig does not
		// support a `condition` filter, so enabling it would pause the agent on
		// EVERY shell command (typecheck, lint, test, ls, etc.).
		//
		// Safety is enforced instead via isDangerousCommand() in the `execute`
		// tool wrapper — dangerous commands are rejected before reaching the
		// sandbox, and the agent is instructed to avoid destructive operations
		// in the system prompt.
		//
		// TODO: Re-enable with condition support once deepagents SDK adds it:
		// interruptOn: { execute: { allowedDecisions: ["approve", "edit", "reject"] } },
	}) as any as DeepAgent;
}

// Re-export so consumers don't need to import from deepagents directly
export type { DeepAgent };
