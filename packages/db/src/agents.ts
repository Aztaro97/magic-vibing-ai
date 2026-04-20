// ─────────────────────────────────────────
// Inferred types
// ─────────────────────────────────────────

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { project } from "./project";
import { user } from "./schema";

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────

export const sandboxProviderEnum = pgEnum("sandbox_provider", [
  "e2b",
  "daytona",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "running",
  "paused", // HITL waiting for human decision
  "done",
  "error",
]);

export const agentEventTypeEnum = pgEnum("agent_event_type", [
  "thinking",
  "token",
  "tool_start",
  "tool_end",
  "todo_update",
  "subagent_start",
  "subagent_end",
  "hitl_pause",
  "hitl_resume",
  "done",
  "error",
]);

// ─────────────────────────────────────────
// agent_sessions  — one row per agent run
// ─────────────────────────────────────────

export const agentSession = pgTable(
  "agent_session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: text("project_id")
      .references(() => project.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),

    /**
     * LangGraph thread ID — equal to `projectId` so all sessions for a
     * project share one checkpointed conversation. NOT unique: a project
     * can have multiple agent sessions over its lifetime.
     */
    threadId: text("thread_id").notNull(),

    /** Active sandbox ID (E2B sandbox ID or Daytona sandbox UUID) */
    sandboxId: text("sandbox_id"),
    sandboxProvider: sandboxProviderEnum("sandbox_provider"),

    status: sessionStatusEnum("status").default("running").notNull(),

    /** The user's original message that started this session */
    initialPrompt: text("initial_prompt").notNull(),

    /** Serialized final summary written when status → done */
    summary: text("summary"),

    /** Total wall-clock ms the session ran for */
    durationMs: integer("duration_ms"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("agent_session_project_idx").on(t.projectId),
    index("agent_session_user_idx").on(t.userId),
    index("agent_session_status_idx").on(t.status),
    index("agent_session_thread_idx").on(t.threadId),
  ],
);

// ─────────────────────────────────────────
// agent_events  — append-only event log per session
// Used for audit trail, replay, and analytics
// ─────────────────────────────────────────

export const agentEvent = pgTable(
  "agent_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .references(() => agentSession.id, { onDelete: "cascade" })
      .notNull(),
    type: agentEventTypeEnum("type").notNull(),
    /** Full event payload as JSON */
    data: jsonb("data").notNull().$type<Record<string, unknown>>(),
    /** Sequence number for client-side ordering and SSE lastEventId resume */
    seq: integer("seq").notNull(),
    ts: timestamp("ts").defaultNow().notNull(),
  },
  (t) => [
    index("agent_event_session_idx").on(t.sessionId),
    index("agent_event_seq_idx").on(t.sessionId, t.seq),
  ],
);

// ─────────────────────────────────────────
// agent_todos  — current todo list snapshot per session
// ─────────────────────────────────────────

export const agentTodo = pgTable(
  "agent_todo",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .references(() => agentSession.id, { onDelete: "cascade" })
      .notNull(),
    text: text("text").notNull(),
    done: text("done").default("false").notNull(),
    priority: text("priority").default("medium").notNull(),
    /** Position in the list */
    order: integer("order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("agent_todo_session_idx").on(t.sessionId)],
);

// ─────────────────────────────────────────
// Relations
// ─────────────────────────────────────────

export const agentSessionRelations = relations(
  agentSession,
  ({ one, many }) => ({
    project: one(project, {
      fields: [agentSession.projectId],
      references: [project.id],
    }),
    user: one(user, { fields: [agentSession.userId], references: [user.id] }),
    events: many(agentEvent),
    todos: many(agentTodo),
  }),
);

export const agentEventRelations = relations(agentEvent, ({ one }) => ({
  session: one(agentSession, {
    fields: [agentEvent.sessionId],
    references: [agentSession.id],
  }),
}));

export const agentTodoRelations = relations(agentTodo, ({ one }) => ({
  session: one(agentSession, {
    fields: [agentTodo.sessionId],
    references: [agentSession.id],
  }),
}));

export type AgentSession = InferSelectModel<typeof agentSession>;
export type NewAgentSession = InferInsertModel<typeof agentSession>;
export type AgentEventRow = InferSelectModel<typeof agentEvent>;
export type NewAgentEventRow = InferInsertModel<typeof agentEvent>;
export type AgentTodo = InferSelectModel<typeof agentTodo>;
