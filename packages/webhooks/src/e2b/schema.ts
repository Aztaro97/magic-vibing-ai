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
 * Full E2B webhook payload
 * @see https://e2b.dev/docs/sandbox/lifecycle-events-webhooks#webhook-payload
 */

export const sandboxLifecycleValues = [
  "sandbox.lifecycle.created",
  "sandbox.lifecycle.killed",
  "sandbox.lifecycle.updated",
  "sandbox.lifecycle.paused",
  "sandbox.lifecycle.resumed",
  "sandbox.lifecycle.checkpointed",
] as const;

export const ExecutionSchema = z.object({
  execution_time: z.number(),
  memory_mb: z.number(),
  started_at: z.coerce.date(),
  vcpu_count: z.number(),
});
export const e2bWebhookPayloadSchema = z.object({
  id: z.string(),
  version: z.string(),
  type: z.enum(sandboxLifecycleValues),
  timestamp: z.coerce.date(),
  event_category: z.string(),
  event_label: z.string(),
  // E2B omits event_data on some lifecycle events (e.g. created)
  event_data: z
    .object({
      sandbox_metadata: z.record(z.string(), z.string()).optional(),
      execution: ExecutionSchema.optional(),
      set_timeout: z.coerce.date().optional(),
    })
    .optional()
    .default({}),
  sandbox_id: z.string(),
  sandbox_execution_id: z.string(),
  sandbox_template_id: z.string(),
  sandbox_build_id: z.string(),
  sandbox_team_id: z.string(),
});

export type E2bWebhookPayload = z.infer<typeof e2bWebhookPayloadSchema>;
