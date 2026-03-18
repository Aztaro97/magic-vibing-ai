import {
  BaseCheckpointSaver,
  BaseStore,
  InMemoryStore,
  MemorySaver,
} from "@langchain/langgraph";

// ─────────────────────────────────────────
// In-process singletons (dev + test)
// ─────────────────────────────────────────
// In production, swap these out for a Postgres-backed checkpointer and store.
// The LangGraph Platform managed service handles this automatically if you deploy there.
// For self-hosted: @langchain/langgraph-checkpoint-postgres provides PostgresSaver.

let _checkpointer: MemorySaver | null = null;
let _store: InMemoryStore | null = null;

/**
 * Returns the singleton in-process MemorySaver.
 *
 * Provides per-thread conversation checkpointing so that agent sessions can
 * pause (HITL), crash, or restart without losing progress.
 * Replace with PostgresSaver when deploying to production.
 */
export function getCheckpointer(): BaseCheckpointSaver {
  if (!_checkpointer) {
    _checkpointer = new MemorySaver();
  }
  return _checkpointer;
}

/**
 * Returns the singleton InMemoryStore.
 *
 * Used by StoreBackend to persist filesystem writes across multiple agent
 * invocations within the same namespace (projectId / userId).
 * Replace with a Postgres-backed store in production.
 */
export function getStore(): BaseStore {
  if (!_store) {
    _store = new InMemoryStore();
  }
  return _store;
}

/**
 * Build a deterministic LangGraph thread ID for a session.
 * Encodes enough context so the supervisor can resume an existing thread.
 */
export function buildThreadId(params: {
  projectId: string;
  sessionId: string;
}): string {
  return `magic-vibing:${params.projectId}:${params.sessionId}`;
}

/**
 * Build the LangGraph namespace used for StoreBackend file operations.
 * All files written by agents for a given project+user are namespaced here.
 */
export function buildStoreNamespace(params: {
  projectId: string;
  userId: string;
}): [string, string] {
  return ["agent-fs", `${params.projectId}:${params.userId}`];
}
