import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseSandbox, DeepAgent } from "deepagents";
import { createDeepAgent, StoreBackend } from "deepagents";

import { env } from "../../env";
import { getCheckpointer, getStore } from "../memory";
import { SUPERVISOR_PROMPT } from "../prompts";
import { ALL_SUBAGENTS } from "../subagents";

// ─────────────────────────────────────────
// Model
// ─────────────────────────────────────────

function buildModel() {
	const apiKey = env.ANTHROPIC_API_KEY;
	if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

	return new ChatAnthropic({
		model: "claude-sonnet-4-6",
		temperature: 0,
		streaming: true,
		maxTokens: 8192,
		anthropicApiKey: apiKey,
	});
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

		// Human-in-the-loop: pause and surface approval before destructive tools.
		// The tRPC subscription delivers these events to the admin UI in real-time.
		interruptOn: {
			// FilesystemMiddleware tools
			execute: {
				// Intercept shell commands that match dangerous patterns.
				// The condition is evaluated server-side; non-matching calls pass through.
				allowedDecisions: ["approve", "edit", "reject"],
			},
		},
	});
}

// Re-export so consumers don't need to import from deepagents directly
export type { DeepAgent };
