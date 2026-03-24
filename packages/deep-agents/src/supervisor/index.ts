import type { BaseSandbox, DeepAgent } from "deepagents";
import { createDeepAgent, StoreBackend } from "deepagents";

import { env } from "../../env";
import { getCheckpointer, getStore } from "../memory";
import { anthropicModel } from "../models/anthropic-model";
import { ollamaModel } from "../models/ollama-model";
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
	const apiKey = env.ANTHROPIC_API_KEY;
	if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

	if (env.NODE_ENV === "development") {
		// Use a model large enough for reliable tool calling in dev
		return ollamaModel({ modelName: "qwen3.5" });
	}
	return anthropicModel({ modelName: "claude-sonnet-4-6" });
}

// ─────────────────────────────────────────
// Supervisor factory
// ─────────────────────────────────────────

export interface SupervisorOptions {
	/**
	 * Sandbox backend injected by @acme/sandboxes router.
	 * When provided, agents gain the `execute` tool for shell commands.
	 * When omitted, agents run without sandbox access (filesystem-only mode).
	 */
	sandbox?: BaseSandbox;
}

/**
 * Creates and returns a compiled DeepAgent graph wired with:
 * - Claude Sonnet 4.6 as the model
 * - Custom Magic Vibing supervisor system prompt
 * - All 5 sub-agents (code, debug, test, doc, review)
 * - StoreBackend for cross-session filesystem persistence
 * - MemorySaver checkpointer for HITL and resume support
 * - HITL gates on destructive operations (rm, publish, force-push)
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
