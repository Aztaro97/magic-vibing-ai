/**
 * Code Agent Graph
 *
 * LangGraph StateGraph for code generation with E2B sandboxing.
 * Replaces code-agent-fn.ts Inngest function (376 lines).
 *
 * Migration: Phase 3 — Main graph with 14+ nodes
 */

import { Annotation, END, StateGraph } from "@langchain/langgraph";

import type { CodeAgentState } from "@acme/validators";

import { getCheckpointer } from "../checkpointer";
import { runAgentNetworkNode } from "../nodes/agent-network";
import {
	chooseModelNode,
	getPreviousMessagesNode,
	getSandboxUrlNode,
	handleErrorNode,
	initializeMessageNode,
	notifyErrorNode,
	notifyStatusNode,
	saveErrorNode,
	saveResultNode,
	setupSandboxNode,
} from "../nodes/index";

// ============================================================================
// State Annotation
// ============================================================================

/**
 * Define state annotation for CodeAgentState
 * Using LangGraph's Annotation API for type-safe state management
 */
const CodeAgentAnnotation = Annotation.Root({
	// Core identifiers
	runId: Annotation<string>,
	projectId: Annotation<string>,
	userId: Annotation<string>,
	messageId: Annotation<string | undefined>,

	// Execution tracking
	currentStep: Annotation<string>,
	completedSteps: Annotation<string[]>,

	// Input
	userPrompt: Annotation<string>,

	// Context
	messages: Annotation<unknown[]>,
	previousMessages: Annotation<unknown[]>,

	// Agent workflow
	agentIterations: Annotation<number>,
	maxIterations: Annotation<number>,
	summary: Annotation<string | undefined>,

	// Sandboxing
	sandboxId: Annotation<string | undefined>,
	sandboxUrl: Annotation<string | undefined>,
	template: Annotation<string | undefined>,

	// Model
	modelProvider: Annotation<string>,
	model: Annotation<string | undefined>,

	// Results
	generatedCode: Annotation<string | undefined>,
	files: Annotation<Record<string, string> | undefined>,

	// Tools
	toolsUsed: Annotation<unknown[]>,

	// Streaming
	streamStatus: Annotation<string | undefined>,
	isStreaming: Annotation<boolean>,

	// Error handling - use errorMessage to match schema
	errorMessage: Annotation<string | undefined>,
	errorType: Annotation<string | undefined>,

	// Timestamps
	createdAt: Annotation<Date>,
	updatedAt: Annotation<Date>,

	// Stream events
	streamEvents: Annotation<unknown[]>,
});

// ============================================================================
// State Graph Definition
// ============================================================================

/**
 * Create the Code Agent StateGraph
 *
 * 11-step orchestration replacing code-agent-fn.ts:
 * 1. Initialize message
 * 2. Notify thinking
 * 3. Setup sandbox
 * 4. Notify setup
 * 5. Get chat history
 * 6. Choose model
 * 7. Notify coding
 * 8. Run agent network
 * 9. Notify running
 * 10. Get sandbox URL
 * 11. Save result
 */
export function createCodeAgentGraph() {
	const graph = new StateGraph(CodeAgentAnnotation);

	// Step 1: Initialize message in DB
	graph.addNode("initialize_message", initializeMessageNode);

	// Step 2: Notify user that agent is thinking
	graph.addNode("notify_thinking", notifyStatusNode("thinking"));

	// Step 3: Setup E2B sandbox
	graph.addNode("setup_sandbox", setupSandboxNode);

	// Step 4: Notify setup complete
	graph.addNode("notify_setup", notifyStatusNode("setup"));

	// Step 5: Load chat history
	graph.addNode("get_history", getPreviousMessagesNode);

	// Step 6: Choose AI model
	graph.addNode("choose_model", chooseModelNode);

	// Step 7: Notify coding started
	graph.addNode("notify_coding", notifyStatusNode("coding"));

	// Step 8: Run agent network (core AI logic)
	graph.addNode("run_agent_network", runAgentNetworkNode);

	// Step 9: Notify running
	graph.addNode("notify_running", notifyStatusNode("running"));

	// Step 10: Get sandbox URL for preview
	graph.addNode("get_sandbox_url", getSandboxUrlNode);

	// Step 11: Save result to DB
	graph.addNode("save_result", saveResultNode);

	// Step 12: Error handling nodes
	graph.addNode("handle_error", handleErrorNode);
	graph.addNode("save_error", saveErrorNode);
	graph.addNode("notify_error", notifyErrorNode);

	// ============================================================================
	// Define edges (workflow with error handling)
	// ============================================================================

	// Helper function to check if state has error
	const hasError = (state: typeof CodeAgentAnnotation.State) =>
		Boolean(state.errorMessage || state.errorType);

	// Start -> Initialize message
	graph.addEdge("__start__" as any, "initialize_message" as any);

	// Initialize -> Notify thinking (with error check)
	graph.addConditionalEdges("initialize_message" as any, (state) =>
		hasError(state) ? "handle_error" : "notify_thinking",
	);

	// Notify thinking -> Setup sandbox
	graph.addEdge("notify_thinking" as any, "setup_sandbox" as any);

	// Setup -> Notify setup (with error check)
	graph.addConditionalEdges("setup_sandbox" as any, (state) =>
		hasError(state) ? "handle_error" : "notify_setup",
	);

	// Notify setup -> Get history
	graph.addEdge("notify_setup" as any, "get_history" as any);

	// Get history -> Choose model
	graph.addEdge("get_history" as any, "choose_model" as any);

	// Choose model -> Notify coding
	graph.addEdge("choose_model" as any, "notify_coding" as any);

	// Notify coding -> Run agent network (main AI work)
	graph.addEdge("notify_coding" as any, "run_agent_network" as any);

	// Run agent -> Notify running (with error check)
	graph.addConditionalEdges("run_agent_network" as any, (state) =>
		hasError(state) ? "handle_error" : "notify_running",
	);

	// Notify running -> Get sandbox URL
	graph.addEdge("notify_running" as any, "get_sandbox_url" as any);

	// Get URL -> Save result (with error check)
	graph.addConditionalEdges("get_sandbox_url" as any, (state) =>
		hasError(state) ? "handle_error" : "save_result",
	);

	// Save result -> End
	graph.addEdge("save_result" as any, END);

	// Error handler chain
	graph.addEdge("handle_error" as any, "save_error" as any);
	graph.addEdge("save_error" as any, "notify_error" as any);
	graph.addEdge("notify_error" as any, END);

	// Compile with checkpointer for state persistence
	const checkpointer = getCheckpointer();
	return graph.compile({ checkpointer });
}

// ============================================================================
// Graph Instance (singleton)
// ============================================================================

let codeAgentGraph: ReturnType<typeof createCodeAgentGraph> | null = null;

/**
 * Get or create the code agent graph instance
 */
export function getCodeAgentGraph() {
	if (!codeAgentGraph) {
		codeAgentGraph = createCodeAgentGraph();
	}
	return codeAgentGraph;
}

// ============================================================================
// Direct Execution Helper
// ============================================================================

/**
 * Run the code agent graph directly
 *
 * @param input - Initial state with projectId, userId, and prompt
 * @returns Final state with generated code and sandbox URL
 */
export async function runCodeAgentGraph(
	input: Pick<CodeAgentState, "projectId" | "userId" | "runId" | "userPrompt"> &
		Partial<Pick<CodeAgentState, "modelProvider" | "template">>,
) {
	const graph = getCodeAgentGraph();

	const result = await graph.invoke({
		...input,
		currentStep: "init",
		completedSteps: [],
		agentIterations: 0,
		isStreaming: true,
		messages: [],
		previousMessages: [],
		toolsUsed: [],
		streamEvents: [],
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	return result;
}

// ============================================================================
// Streaming Execution
// ============================================================================

/**
 * Stream the code agent graph execution
 *
 * @param input - Initial state
 * @yields State updates at each step
 */
export async function* streamCodeAgentGraph(
	input: Pick<CodeAgentState, "projectId" | "userId" | "runId" | "userPrompt"> &
		Partial<Pick<CodeAgentState, "modelProvider" | "template">>,
) {
	const graph = getCodeAgentGraph();

	const stream = await graph.stream(
		{
			...input,
			currentStep: "init",
			completedSteps: [],
			agentIterations: 0,
			isStreaming: true,
			messages: [],
			previousMessages: [],
			toolsUsed: [],
			streamEvents: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		{ streamMode: "updates" },
	);

	for await (const update of stream) {
		yield update;
	}
}

// Export the compiled graph instance for LangGraph Studio/CLI
export const graph = getCodeAgentGraph();
