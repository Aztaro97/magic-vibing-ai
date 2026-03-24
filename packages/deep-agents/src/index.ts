import { createMagicVibingAgent } from "./supervisor";
import { LazyE2BSandbox } from "./sandbox/lazy-e2b";

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
export { createMagicVibingAgent } from "./supervisor";
export {
	transformAgentStream,
	type TransformResult,
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

// When E2B_API_KEY is available, wire a lazy sandbox so the LangGraph dev
// server graph has access to the `execute` tool (shell commands in E2B).
// Without this, the graph falls back to StoreBackend (filesystem-only).
const sandbox = process.env.E2B_API_KEY ? new LazyE2BSandbox() : undefined;

export const graph = createMagicVibingAgent({ sandbox });

