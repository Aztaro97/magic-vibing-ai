// apps/admin/src/components/agent/useAgentStream.ts
"use client";

import { useCallback, useReducer, useRef } from "react";

import type { AgentEvent, TodoItem } from "@acme/deep-agents";

import { trpc } from "~/trpc/server";

// ─────────────────────────────────────────
// State shape
// ─────────────────────────────────────────

export interface AgentStreamState {
  status: "idle" | "running" | "paused" | "done" | "error";
  tokens: string; // accumulated token stream (displayed in real-time)
  thinking: string[]; // supervisor thinking messages
  todos: TodoItem[];
  events: AgentEvent[]; // full ordered event log for the session panel
  toolCalls: ActiveToolCall[];
  activeSubagent: string | null;
  hitlPending: HitlPending | null;
  errorMessage: string | null;
  durationMs: number | null;
}

export interface ActiveToolCall {
  toolName: string;
  toolInput: unknown;
  startedAt: number;
}

export interface HitlPending {
  toolName: string;
  toolInput: unknown;
  allowedDecisions: string[];
}

type Action =
  | { type: "RESET" }
  | { type: "APPLY_EVENT"; event: AgentEvent }
  | { type: "DONE"; durationMs: number }
  | { type: "ERROR"; message: string };

// ─────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────

const INITIAL: AgentStreamState = {
  status: "idle",
  tokens: "",
  thinking: [],
  todos: [],
  events: [],
  toolCalls: [],
  activeSubagent: null,
  hitlPending: null,
  errorMessage: null,
  durationMs: null,
};

function reducer(state: AgentStreamState, action: Action): AgentStreamState {
  switch (action.type) {
    case "RESET":
      return { ...INITIAL, status: "running" };

    case "APPLY_EVENT": {
      const ev = action.event;
      const events = [...state.events, ev];

      switch (ev.type) {
        case "token":
          return {
            ...state,
            events,
            tokens: state.tokens + (ev.data as { text: string }).text,
          };

        case "thinking":
          return {
            ...state,
            events,
            thinking: [...state.thinking, (ev.data as { text: string }).text],
          };

        case "todo_update":
          return {
            ...state,
            events,
            todos: (ev.data as { todos: TodoItem[] }).todos,
          };

        case "tool_start": {
          const d = ev.data as { toolName: string; toolInput: unknown };
          return {
            ...state,
            events,
            toolCalls: [
              ...state.toolCalls,
              {
                toolName: d.toolName,
                toolInput: d.toolInput,
                startedAt: Date.now(),
              },
            ],
          };
        }

        case "tool_end": {
          const d = ev.data as { toolName: string };
          return {
            ...state,
            events,
            toolCalls: state.toolCalls.filter((t) => t.toolName !== d.toolName),
          };
        }

        case "subagent_start":
          return {
            ...state,
            events,
            activeSubagent: (ev.data as { agentName: string }).agentName,
          };

        case "subagent_end":
          return { ...state, events, activeSubagent: null };

        case "hitl_pause":
          return {
            ...state,
            events,
            status: "paused",
            hitlPending: ev.data as HitlPending,
          };

        case "hitl_resume":
          return { ...state, events, status: "running", hitlPending: null };

        case "done":
          return {
            ...state,
            events,
            status: "done",
            durationMs: (ev.data as { durationMs: number }).durationMs,
          };

        case "error":
          return {
            ...state,
            events,
            status: "error",
            errorMessage: (ev.data as { message: string }).message,
          };

        default:
          return { ...state, events };
      }
    }

    case "DONE":
      return { ...state, status: "done", durationMs: action.durationMs };

    case "ERROR":
      return { ...state, status: "error", errorMessage: action.message };

    default:
      return state;
  }
}

// ─────────────────────────────────────────
// Hook
// ─────────────────────────────────────────

export interface UseAgentStreamOptions {
  projectId: string;
  sessionId: string;
}

export function useAgentStream({
  projectId,
  sessionId,
}: UseAgentStreamOptions) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const lastEventIdRef = useRef<number | undefined>(undefined);

  // ── tRPC HITL mutation ──────────────────────────────────────────────────
  const resolveHitl = trpc.agent.resolveHitl.useMutation();
  const cancelSession = trpc.agent.cancelSession.useMutation();

  // ── tRPC SSE subscription ───────────────────────────────────────────────
  // `enabled` is controlled externally via the userMessage being set
  const [pendingMessage, setPendingMessage] = useReducerState<string | null>(
    null,
  );

  trpc.agent.run.useSubscription(
    {
      projectId,
      sessionId,
      userMessage: pendingMessage ?? "",
      lastEventId: lastEventIdRef.current,
    },
    {
      enabled: pendingMessage !== null,
      onData(event: AgentEvent) {
        dispatch({ type: "APPLY_EVENT", event });
        // Track the last event seq for reconnect support
        const seq = parseInt(event.ts, 10);
        if (!isNaN(seq)) lastEventIdRef.current = seq;
      },
      onError(err) {
        dispatch({ type: "ERROR", message: err.message });
      },
    },
  );

  // ── Public API ──────────────────────────────────────────────────────────

  const send = useCallback(
    (message: string) => {
      dispatch({ type: "RESET" });
      setPendingMessage(message);
    },
    [setPendingMessage],
  );

  const approveHitl = useCallback(
    async (decision: "approve" | "edit" | "reject", editedInput?: unknown) => {
      await resolveHitl.mutateAsync({ sessionId, decision, editedInput });
      dispatch({
        type: "APPLY_EVENT",
        event: {
          type: "hitl_resume",
          ts: new Date().toISOString(),
          data: { decision },
        },
      });
      // Re-subscribe with the HITL decision injected
      setPendingMessage(`__hitl:${decision}`);
    },
    [sessionId, resolveHitl, setPendingMessage],
  );

  const cancel = useCallback(async () => {
    await cancelSession.mutateAsync({ sessionId });
    dispatch({ type: "ERROR", message: "Session cancelled by user." });
    setPendingMessage(null);
  }, [sessionId, cancelSession, setPendingMessage]);

  return { state, send, approveHitl, cancel };
}

// Tiny helper to use a useState-style setter inside useCallback without stale closure issues
function useReducerState<T>(initial: T): [T, (v: T) => void] {
  const [s, d] = useReducer((_: T, next: T) => next, initial);
  return [s, d];
}
