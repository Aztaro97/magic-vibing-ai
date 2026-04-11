import type { SubAgent } from "deepagents";

import type { SandboxProvider } from "@acme/sandboxes";

// Re-export so consumers can import from @acme/deep-agents/types
export type { SandboxProvider };

// ─────────────────────────────────────────
// Agent run event stream
// ─────────────────────────────────────────

export type AgentEventType =
  | "thinking"       // supervisor is planning
  | "tool_start"     // tool invocation begins
  | "tool_end"       // tool invocation result
  | "token"          // streamed token from the model
  | "todo_update"    // write_todos fired, todo list changed
  | "subagent_start" // task tool handed off to a sub-agent
  | "subagent_end"   // sub-agent returned
  | "hitl_pause"     // agent paused awaiting human approval
  | "hitl_resume"    // human approved/rejected, agent resumed
  | "sandbox_ready"  // sandbox + ngrok tunnel confirmed live
  | "done"           // run complete
  | "error";         // fatal error

export interface AgentEvent {
  type: AgentEventType;
  /** ISO timestamp */
  ts: string;
  /** Freeform payload — typed per event type below */
  data: AgentEventData[AgentEventType];
}

export interface AgentEventData {
  thinking: { text: string };
  token: { text: string };
  tool_start: { toolName: string; toolInput: unknown };
  tool_end: { toolName: string; toolOutput: string; durationMs: number };
  todo_update: { todos: TodoItem[] };
  subagent_start: { agentName: string; task: string };
  subagent_end: { agentName: string; summary: string; durationMs: number };
  hitl_pause: {
    toolName: string;
    toolInput: unknown;
    allowedDecisions: string[];
  };
  hitl_resume: { decision: "approve" | "edit" | "reject"; reason?: string };
  /**
   * Emitted once the E2B sandbox is provisioned and the ngrok tunnel is
   * confirmed live. Clients (mobile app, web dashboard) should subscribe
   * to this event to update the preview URL without polling the DB.
   */
  sandbox_ready: {
    sandboxId: string;
    provider: SandboxProvider;
    /** Stable custom domain: https://{projectId}.ngrok.dev */
    ngrokUrl: string;
  };
  done: { summary: string; durationMs: number };
  error: { message: string; code?: string };
}

// ─────────────────────────────────────────
// Shared domain types
// ─────────────────────────────────────────

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  priority: "high" | "medium" | "low";
}

export interface RunAgentInput {
  projectId: string;
  sessionId: string;
  userMessage: string;
  /** Which sandbox backend to use. Supervisor auto-selects when omitted. */
  sandboxProvider?: SandboxProvider;
  /** Human-in-the-loop: decision on a paused tool call */
  hitlDecision?: {
    decision: "approve" | "edit" | "reject";
    editedInput?: unknown;
    reason?: string;
  };
}

export interface AgentSessionMeta {
  sessionId: string;
  projectId: string;
  userId: string;
  /**
   * LangGraph thread ID for checkpointing.
   * Set equal to projectId so all sessions for the same project share one
   * thread — enabling seamless resume across reconnects and HITL pauses.
   */
  threadId: string;
  sandboxId?: string;
  sandboxProvider?: SandboxProvider;
  status: "running" | "paused" | "done" | "error";
  createdAt: Date;
  updatedAt: Date;
}

export type { SubAgent };
