import type { StreamEvent } from "@langchain/core/tracers/log_stream";

import type { AgentEvent, AgentEventType, TodoItem } from "../types";

// ─────────────────────────────────────────
// LangGraph event name constants
// ─────────────────────────────────────────

const TOOL_START = "on_tool_start";
const TOOL_END = "on_tool_end";
const LLM_STREAM = "on_chat_model_stream";
const CHAIN_STREAM = "on_chain_stream";

// LangGraph emits these when a graph interrupts (HITL)
const CHAIN_END = "on_chain_end";

// ─────────────────────────────────────────
// Transformer
// ─────────────────────────────────────────

/**
 * Result from the stream transformer indicating whether the agent completed
 * normally or was interrupted (HITL pause).
 */
export interface TransformResult {
  interrupted: boolean;
  interruptToolName?: string;
  interruptToolInput?: unknown;
}

/**
 * Converts the raw `StreamEvent` objects emitted by LangGraph's `.streamEvents()`
 * into typed `AgentEvent` objects consumed by the tRPC subscription.
 *
 * Only events that map cleanly to a UI action are emitted; internal LangGraph
 * bookkeeping events are silently dropped.
 *
 * The `result` object is mutated during streaming to track whether the graph
 * was interrupted (HITL). Callers should check `result.interrupted` after
 * the generator is exhausted.
 */
export async function* transformAgentStream(
  stream: AsyncIterable<StreamEvent>,
  result: TransformResult = { interrupted: false },
): AsyncGenerator<AgentEvent> {
  const toolStartTimes = new Map<string, number>();
  let lastPendingToolName: string | undefined;
  let lastPendingToolInput: unknown;

  for await (const event of stream) {
    const ts = new Date().toISOString();
    const runId = event.run_id ?? "unknown";

    // ── LLM token stream ─────────────────────────────────────────────────────
    if (event.event === LLM_STREAM) {
      const chunk = event.data?.chunk;
      const text =
        typeof chunk?.content === "string"
          ? chunk.content
          : (chunk?.content?.[0]?.text ?? "");

      if (text) {
        yield makeEvent("token", ts, { text });
      }
      continue;
    }

    // ── Tool start ───────────────────────────────────────────────────────────
    if (event.event === TOOL_START) {
      const toolName: string = event.name ?? "unknown_tool";
      toolStartTimes.set(runId, Date.now());

      // Track the last tool that started — if the stream ends without a
      // matching tool_end, it was interrupted by HITL.
      lastPendingToolName = toolName;
      lastPendingToolInput = event.data?.input;

      // todo list update
      if (toolName === "write_todos") {
        const todos = parseTodos(event.data?.input);
        if (todos) {
          yield makeEvent("todo_update", ts, { todos });
          continue;
        }
      }

      // sub-agent task delegation
      if (toolName === "task") {
        const agentName: string = event.data?.input?.name ?? "sub-agent";
        const task: string = event.data?.input?.task ?? "";
        yield makeEvent("subagent_start", ts, { agentName, task });
        continue;
      }

      // Generic tool start
      yield makeEvent("tool_start", ts, {
        toolName,
        toolInput: event.data?.input ?? {},
      });
      continue;
    }

    // ── Tool end ─────────────────────────────────────────────────────────────
    if (event.event === TOOL_END) {
      const toolName: string = event.name ?? "unknown_tool";
      const startedAt = toolStartTimes.get(runId) ?? Date.now();
      const durationMs = Date.now() - startedAt;
      toolStartTimes.delete(runId);

      // Clear pending tool — it completed normally
      if (toolName === lastPendingToolName) {
        lastPendingToolName = undefined;
        lastPendingToolInput = undefined;
      }

      const output =
        typeof event.data?.output === "string"
          ? event.data.output
          : JSON.stringify(event.data?.output ?? {});

      // sub-agent task complete
      if (toolName === "task") {
        const agentName: string = event.data?.input?.name ?? "sub-agent";
        yield makeEvent("subagent_end", ts, {
          agentName,
          summary: output.slice(0, 500),
          durationMs,
        });
        continue;
      }

      yield makeEvent("tool_end", ts, {
        toolName,
        toolOutput: output,
        durationMs,
      });
      continue;
    }

    // ── Chain-level thinking text ─────────────────────────────────────────────
    if (event.event === CHAIN_STREAM) {
      const text: string =
        event.data?.chunk?.messages?.[0]?.content ??
        event.data?.chunk?.content ??
        "";
      if (text && text.trim()) {
        yield makeEvent("thinking", ts, { text });
      }
      continue;
    }

    // ── Chain end — detect HITL interrupts ────────────────────────────────────
    // When LangGraph interrupts for HITL, the graph suspends and emits a
    // chain_end with interrupt metadata. Detect this to emit hitl_pause.
    if (event.event === CHAIN_END) {
      const interrupt = event.data?.output?.__interrupt;
      if (interrupt) {
        result.interrupted = true;
        result.interruptToolName = lastPendingToolName;
        result.interruptToolInput = lastPendingToolInput;

        yield makeEvent("hitl_pause", new Date().toISOString(), {
          toolName: lastPendingToolName ?? "execute",
          toolInput: lastPendingToolInput ?? {},
          allowedDecisions: ["approve", "edit", "reject"],
        });
      }
      continue;
    }
  }

  // If stream ended with a pending tool (tool_start without tool_end),
  // the graph was likely interrupted for HITL even if we missed the event.
  if (lastPendingToolName && !result.interrupted) {
    result.interrupted = true;
    result.interruptToolName = lastPendingToolName;
    result.interruptToolInput = lastPendingToolInput;

    yield makeEvent("hitl_pause", new Date().toISOString(), {
      toolName: lastPendingToolName,
      toolInput: lastPendingToolInput ?? {},
      allowedDecisions: ["approve", "edit", "reject"],
    });
  }
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function makeEvent<T extends AgentEventType>(
  type: T,
  ts: string,
  data: AgentEvent["data"],
): AgentEvent {
  return { type, ts, data } as AgentEvent;
}

function parseTodos(input: unknown): TodoItem[] | null {
  try {
    if (!input || typeof input !== "object") return null;
    const raw = (input as Record<string, unknown>).todos;
    if (!Array.isArray(raw)) return null;
    return raw as TodoItem[];
  } catch {
    return null;
  }
}
