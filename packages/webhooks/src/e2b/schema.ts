import { z } from "zod";

/**
 * E2B sandbox lifecycle event types
 * @see https://e2b.dev/docs/sandbox/lifecycle-events-webhooks
 */
export const e2bEventTypes = [
	"sandbox.lifecycle.created",
	"sandbox.lifecycle.killed",
	"sandbox.lifecycle.updated",
	"sandbox.lifecycle.paused",
	"sandbox.lifecycle.resumed",
	"sandbox.lifecycle.checkpointed",
] as const;

export const e2bEventTypeSchema = z.enum(e2bEventTypes);

export type E2bEventType = z.infer<typeof e2bEventTypeSchema>;

/**
 * Execution details — present on killed and paused events
 */
export const e2bExecutionSchema = z.object({
	started_at: z.string(),
	vcpu_count: z.number().int(),
	memory_mb: z.number().int(),
	execution_time: z.number().int(),
});

/**
 * Event data containing sandbox metadata and optional execution info
 */
export const e2bEventDataSchema = z.object({
	sandbox_metadata: z.record(z.string()).optional(),
	execution: e2bExecutionSchema.optional(),
});

/**
 * Full E2B webhook payload
 * @see https://e2b.dev/docs/sandbox/lifecycle-events-webhooks#webhook-payload
 */
export const e2bWebhookPayloadSchema = z.object({
	version: z.string(),
	id: z.string(),
	type: e2bEventTypeSchema,
	eventData: e2bEventDataSchema,
	sandboxBuildId: z.string().optional(),
	sandboxExecutionId: z.string().optional(),
	sandboxId: z.string(),
	sandboxTeamId: z.string().optional(),
	sandboxTemplateId: z.string().optional(),
	timestamp: z.string(),
});

export type E2bWebhookPayload = z.infer<typeof e2bWebhookPayloadSchema>;
