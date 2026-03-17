import { StreamEvent } from "@langchain/core/tracers/log_stream";

import type { AgentEvent, AgentEventType, TodoItem } from "../types";

// ─────────────────────────────────────────
// LangGraph event name constants
// ─────────────────────────────────────────

const TOOL_START = "on_tool_start";
const TOOL_END = "on_tool_end";
const LLM_STREAM = "on_chat_model_stream";
const CHAIN_STREAM = "on_chain_stream";

// ─────────────────────────────────────────
// Transformer
// ─────────────────────────────────────────

/**
 * Converts the raw `StreamEvent` objects emitted by LangGraph's `.streamEvents()`
 * into typed `AgentEvent` objects consumed by the tRPC subscription.
 *
 * Only events that map cleanly to a UI action are emitted; internal LangGraph
 * bookkeeping events are silently dropped.
 */
export async function* transformAgentStream(
  stream: AsyncIterable<StreamEvent>,
): AsyncGenerator<AgentEvent> {
  const toolStartTimes = new Map<string, number>();

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
