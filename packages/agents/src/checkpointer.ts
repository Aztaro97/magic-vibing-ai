/**
 * LangGraph Checkpointer
 *
 * PostgresSaver implementation for state persistence.
 * Enables resumable workflows and human-in-the-loop patterns.
 *
 * Migration: Phase 3 — Checkpointing for LangGraph
 */

import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

import { env } from "../env";

/**
 * Create a PostgresSaver checkpointer instance
 *
 * Uses the existing database connection string
 * Stores checkpoints in the langgraph_checkpoints table
 */
export function createCheckpointer() {
	const connString = env.POSTGRES_URL;

	return PostgresSaver.fromConnString(connString, {
		// Optional: use a custom schema (default: "public")
		// schema: "public",
	});
}

/**
 * Singleton checkpointer instance
 */
let checkpointer: ReturnType<typeof createCheckpointer> | undefined;

/**
 * Get or create the checkpointer instance
 */
export function getCheckpointer() {
	checkpointer ??= createCheckpointer();
	return checkpointer;
}

/**
 * Setup function to ensure checkpoint table exists
 * Call this during app initialization
 */
export async function setupCheckpointer() {
	const cp = getCheckpointer();
	// Must call setup() the first time to create tables
	await cp.setup();
	return cp;
}
