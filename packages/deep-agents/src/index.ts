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
export { createMagicVibingAgent } from "./supervisor";
export { transformAgentStream } from "./supervisor/stream-transformer";
export type {
	AgentEvent,
	AgentEventData,
	AgentEventType,
	AgentSessionMeta,
	RunAgentInput,
	SandboxProvider,
	TodoItem
} from "./types";

export const graph = createMagicVibingAgent();

