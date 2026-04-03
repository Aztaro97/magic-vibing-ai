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

import { agentSession } from "./agents";

// ─────────────────────────────────────────
// Enums
// ─────────────────────────────────────────

export const sandboxLifecycleEventEnum = pgEnum("sandbox_lifecycle_event", [
	"sandbox.lifecycle.created",
	"sandbox.lifecycle.killed",
	"sandbox.lifecycle.updated",
	"sandbox.lifecycle.paused",
	"sandbox.lifecycle.resumed",
	"sandbox.lifecycle.checkpointed",
]);

// ─────────────────────────────────────────
// sandbox_event — E2B webhook lifecycle events
// ─────────────────────────────────────────

export const sandboxEvent = pgTable(
	"sandbox_event",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		/** E2B event ID from the webhook payload */
		e2bEventId: text("e2b_event_id").notNull().unique(),

		/** E2B sandbox ID — matches agentSession.sandboxId */
		sandboxId: text("sandbox_id").notNull(),

		/** E2B unique execution ID */
		sandboxExecutionId: text("sandbox_execution_id"),

		/** E2B template ID */
		sandboxTemplateId: text("sandbox_template_id"),

		/** E2B template build ID */
		sandboxBuildId: text("sandbox_build_id"),

		/** E2B team ID */
		sandboxTeamId: text("sandbox_team_id"),

		/** Lifecycle event type */
		type: sandboxLifecycleEventEnum("type").notNull(),

		/** Custom metadata attached to the sandbox */
		sandboxMetadata: jsonb("sandbox_metadata").$type<
			Record<string, string>
		>(),

		/** Execution details (present on killed/paused events) */
		executionStartedAt: timestamp("execution_started_at"),
		executionVcpuCount: integer("execution_vcpu_count"),
		executionMemoryMb: integer("execution_memory_mb"),
		executionTimeMs: integer("execution_time_ms"),

		/** Timestamp from the E2B event payload */
		eventTimestamp: timestamp("event_timestamp").notNull(),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(t) => [
		index("sandbox_event_sandbox_id_idx").on(t.sandboxId),
		index("sandbox_event_type_idx").on(t.type),
		index("sandbox_event_timestamp_idx").on(t.eventTimestamp),
	],
);

// ─────────────────────────────────────────
// Relations
// ─────────────────────────────────────────

export const sandboxEventRelations = relations(sandboxEvent, ({ one }) => ({
	agentSession: one(agentSession, {
		fields: [sandboxEvent.sandboxId],
		references: [agentSession.sandboxId],
	}),
}));

// ─────────────────────────────────────────
// Inferred types
// ─────────────────────────────────────────

export type SandboxEvent = InferSelectModel<typeof sandboxEvent>;
export type NewSandboxEvent = InferInsertModel<typeof sandboxEvent>;
