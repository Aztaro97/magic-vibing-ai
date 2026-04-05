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
	REVIEW_AGENT_PROMPT,
	SUPERVISOR_PROMPT,
	TEST_AGENT_PROMPT
} from "./prompts";
export {
	ALL_SUBAGENTS,
	codeAgent,
	debugAgent,
	docAgent,
	reviewAgent,
	testAgent
} from "./subagents";
export { LazySandbox } from "./sandbox/lazy-sandbox";
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

// When any sandbox provider key is available, wire a lazy sandbox so the
// LangGraph dev server graph has access to the `execute` tool (shell commands).
// Without this, the graph falls back to StoreBackend (filesystem-only).
// The LazySandbox auto-selects E2B or Daytona via @acme/sandboxes router.
const hasSandboxProvider = Boolean(env.E2B_API_KEY) || Boolean(env.DAYTONA_API_KEY);

if (!hasSandboxProvider) {
	console.warn(
		"[deep-agents] No sandbox provider key found. " +
		"The `execute` tool will not be available to agents. " +
		"Set E2B_API_KEY (recommended) or DAYTONA_API_KEY in your .env to enable shell execution.",
	);
}

const sandbox = hasSandboxProvider ? new LazySandbox() : undefined;

// Ensure lazy-provisioned sandbox is cleaned up on process exit (prevents
// leaked E2B sandboxes billed by uptime in the dev server).
if (sandbox) {
	const cleanup = () => { sandbox.close().catch(console.error); };
	process.on("SIGTERM", cleanup);
	process.on("SIGINT", cleanup);
}

export const graph = createMagicVibingAgent({ sandbox });
