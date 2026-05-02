import type { BackendRuntime } from "deepagents";
import { env } from "../env";
import { LazySandbox } from "./sandbox/lazy-sandbox";
import { createMagicVibingAgent } from "./supervisor";

export {
	buildStoreNamespace,
	buildThreadId,
	getCheckpointer,
	getStore
} from "./memory";
export {
	CODE_AGENT_PROMPT,
	DEBUG_AGENT_PROMPT,
	DOC_AGENT_PROMPT,
	RESEARCH_AGENT_PROMPT,
	REVIEW_AGENT_PROMPT,
	SUPERVISOR_PROMPT,
	TEST_AGENT_PROMPT
} from "./prompts";
export { LazySandbox } from "./sandbox/lazy-sandbox";
export {
	ALL_SUBAGENTS,
	codeAgent,
	debugAgent,
	docAgent,
	researchAnalystAgent,
	reviewAgent,
	testAgent
} from "./subagents";
export { createMagicVibingAgent } from "./supervisor";
export {
	transformAgentStream,
	type TransformResult
} from "./supervisor/stream-transformer";
export type {
	AgentEvent,
	AgentEventData,
	AgentEventType,
	AgentSessionMeta,
	RunAgentInput,
	SandboxProvider,
	TodoItem
} from "./types";

// ─────────────────────────────────────────
// LangGraph dev server graph export
// ─────────────────────────────────────────
// Sandbox provisioning and cleanup are scoped to a factory function to avoid
// side effects at import time (console.warn, process.on listeners). The graph
// is still exported as a top-level const for LangGraph compatibility.

async function buildDevGraph(runtime?: BackendRuntime) {
	const hasSandboxProvider = Boolean(env.E2B_API_KEY) || Boolean(env.DAYTONA_API_KEY);

	if (!hasSandboxProvider) {
		console.warn(
			"[deep-agents] No sandbox provider key found. " +
			"The `execute` tool will not be available to agents. " +
			"Set E2B_API_KEY (recommended) or DAYTONA_API_KEY in your .env to enable shell execution.",
		);
	}

	// Pass runtime to LazySandbox so _autoProvision can extract projectId/sessionId
	// from runtime.configurable when the agent is invoked via the LangGraph dev server.
	const sandbox = hasSandboxProvider ? new LazySandbox({ runtime }) : undefined;

	// Ensure lazy-provisioned sandbox is cleaned up on process exit (prevents
	// leaked E2B sandboxes billed by uptime in the dev server).
	if (sandbox) {
		const cleanup = () => { sandbox.close().catch(console.error); };
		process.on("SIGTERM", cleanup);
		process.on("SIGINT", cleanup);
	}

	return createMagicVibingAgent({ sandbox });
}

export const graph = async (runtime?: BackendRuntime) => await buildDevGraph(runtime);
