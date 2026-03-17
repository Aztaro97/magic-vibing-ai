/**
 * Hello World Graph
 *
 * Simple LangGraph StateGraph for testing the migration setup.
 * Replaces hello-word-fn.ts Inngest function.
 *
 * Migration: Phase 3 — Simplest graph for validation
 */

import { StateGraph } from "@langchain/langgraph";

import type { HelloWorldState } from "@acme/validators";

import { getCheckpointer } from "../checkpointer";
import {
	createExpoSandboxNode,
	getHelloWorldUrlNode,
	notifyStatusNode,
} from "../nodes/index";

// ============================================================================
// State Graph Definition
// ============================================================================

/**
 * Create the Hello World StateGraph
 *
 * Simple 3-node graph:
 * 1. Create sandbox
 * 2. Get URL
 * 3. Notify completion
 */
export function createHelloWorldGraph() {
	const graph = new StateGraph<HelloWorldState>({
		channels: {} as any,
	});

	// Add nodes
	graph.addNode("create_sandbox", createExpoSandboxNode as any);
	graph.addNode("get_url", getHelloWorldUrlNode as any);
	graph.addNode("notify_complete", notifyStatusNode("completed") as any);

	// Define edges
	graph.addEdge("__start__" as any, "create_sandbox" as any);
	graph.addEdge("create_sandbox" as any, "get_url" as any);
	graph.addEdge("get_url" as any, "notify_complete" as any);
	graph.addEdge("notify_complete" as any, "__end__" as any);

	// Compile with checkpointer for state persistence
	const checkpointer = getCheckpointer();
	return graph.compile({ checkpointer });
}

// ============================================================================
// Graph Instance (singleton)
// ============================================================================

let helloWorldGraph: ReturnType<typeof createHelloWorldGraph> | null = null;

/**
 * Get or create the hello world graph instance
 */
export function getHelloWorldGraph() {
	if (!helloWorldGraph) {
		helloWorldGraph = createHelloWorldGraph();
	}
	return helloWorldGraph;
}

// ============================================================================
// Direct Execution Helper
// ============================================================================

/**
 * Run the hello world graph directly
 *
 * @param input - Initial state with projectId
 * @returns Final state with sandbox URL
 */
export async function runHelloWorldGraph(input: {
	projectId: string;
	userId: string;
	runId: string;
}) {
	const graph = getHelloWorldGraph();

	const result = await graph.invoke({
		...input,
		currentStep: "init",
		completedSteps: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		modelProvider: "openai" as const,
		errorRecoverable: false,
		streamEvents: [],
	});

	return result as HelloWorldState;
}
