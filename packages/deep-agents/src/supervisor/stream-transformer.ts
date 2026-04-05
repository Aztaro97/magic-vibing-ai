import type { StreamEvent } from "@langchain/core/tracers/log_stream";
import { z } from "zod";

import type { AgentEvent, AgentEventType, TodoItem } from "../types";

const TOOL_START = "on_tool_start";
const TOOL_END = "on_tool_end";
const LLM_STREAM = "on_chat_model_stream";
const CHAIN_STREAM = "on_chain_stream";
const CHAIN_END = "on_chain_end";

const TodoSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
  priority: z.enum(["high", "medium", "low"]),
});

export interface TransformResult {
  interrupted: boolean;
  interruptToolName?: string;
  interruptToolInput?: unknown;
}

export async function* transformAgentStream(
  stream: AsyncIterable<StreamEvent>,
  result: TransformResult = { interrupted: false },
): AsyncGenerator<AgentEvent> {
  const toolStartTimes = new Map<string, number>();
  const runStartTime = Date.now();
  let lastPendingToolName: string | undefined;
  let lastPendingToolInput: unknown;

  for await (const event of stream) {
    const ts = new Date().toISOString();
    const runId = event.run_id ?? "unknown";

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

    if (event.event === TOOL_START) {
      const toolName: string = event.name ?? "unknown_tool";
      toolStartTimes.set(runId, Date.now());
      lastPendingToolName = toolName;
      lastPendingToolInput = event.data?.input;

      if (toolName === "write_todos") {
        const todos = parseTodos(event.data?.input);
        if (todos) {
          yield makeEvent("todo_update", ts, { todos });
          continue;
        }
      }

      if (toolName === "task") {
        const agentName: string = event.data?.input?.name ?? "sub-agent";
        const task: string = event.data?.input?.task ?? "";
        yield makeEvent("subagent_start", ts, { agentName, task });
        continue;
      }

      yield makeEvent("tool_start", ts, {
        toolName,
        toolInput: event.data?.input ?? {},
      });
      continue;
    }

    if (event.event === TOOL_END) {
      const toolName: string = event.name ?? "unknown_tool";
      const startedAt = toolStartTimes.get(runId) ?? Date.now();
      const durationMs = Date.now() - startedAt;
      toolStartTimes.delete(runId);

      if (toolName === lastPendingToolName) {
        lastPendingToolName = undefined;
        lastPendingToolInput = undefined;
      }

      const output =
        typeof event.data?.output === "string"
          ? event.data.output
          : JSON.stringify(event.data?.output ?? {});

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

  if (lastPendingToolName && !result.interrupted) {
    result.interrupted = true;
    result.interruptToolName = lastPendingToolName;
    result.interruptToolInput = lastPendingToolInput;

    yield makeEvent("hitl_pause", new Date().toISOString(), {
      toolName: lastPendingToolName,
      toolInput: lastPendingToolInput ?? {},
      allowedDecisions: ["approve", "edit", "reject"],
    });
    return;
  }

  if (!result.interrupted) {
    yield makeEvent("done", new Date().toISOString(), {
      summary: "Agent run completed",
      durationMs: Date.now() - runStartTime,
    });
  }
}

function makeEvent<T extends AgentEventType>(
  type: T,
  ts: string,
  data: AgentEvent["data"],
): AgentEvent {
  return { type, ts, data } as AgentEvent;
}

function parseTodos(input: unknown): TodoItem[] | null {
  try {
    const parsed = z.object({ todos: z.array(TodoSchema) }).safeParse(input);
    return parsed.success ? parsed.data.todos : null;
  } catch {
    return null;
  }
}
