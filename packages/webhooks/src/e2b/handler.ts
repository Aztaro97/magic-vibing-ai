import { eq } from "drizzle-orm/sql";

import { project } from "@acme/db";
import { agentSession } from "@acme/db/agents";
import { db } from "@acme/db/client";
import { sandboxEvent } from "@acme/db/sandbox-event";

import type { E2bWebhookPayload } from "./schema";
import { e2bWebhookPayloadSchema } from "./schema";
import { verifyE2bSignature } from "./verify";

// ─────────────────────────────────────────
// Map E2B lifecycle events → agentSession status
// ─────────────────────────────────────────

const EVENT_TO_SESSION_STATUS: Partial<
  Record<E2bWebhookPayload["type"], "running" | "paused" | "done" | "error">
> = {
  "sandbox.lifecycle.created": "running",
  "sandbox.lifecycle.resumed": "running",
  "sandbox.lifecycle.paused": "paused",
  "sandbox.lifecycle.killed": "done",
};

// Maps E2B lifecycle events → project.sandboxStatus ("active" | "paused" | "destroyed").
// `created` uses projectId from sandbox_metadata to write sandboxId to the project row
// immediately — before the lifecycle manager finishes ngrok setup (~12 s later).
// All events prefer a direct project.id lookup via metadata; fallback to project.sandboxId.
const EVENT_TO_PROJECT_STATUS: Partial<
  Record<E2bWebhookPayload["type"], "active" | "paused" | "destroyed">
> = {
  "sandbox.lifecycle.created": "active",
  "sandbox.lifecycle.resumed": "active",
  "sandbox.lifecycle.paused": "paused",
  "sandbox.lifecycle.killed": "destroyed",
};

// ─────────────────────────────────────────
// Public handler
// ─────────────────────────────────────────

export interface HandleE2bWebhookResult {
  success: boolean;
  eventId: string | null;
  error?: string;
}

/**
 * Process an incoming E2B webhook request.
 *
 * 1. Verify signature (if secret is configured)
 * 2. Parse & validate JSON payload
 * 3. Insert sandbox_event row (idempotent via e2b_event_id unique constraint)
 * 4. Update the linked agentSession status when applicable
 * 5. Update the linked project sandboxStatus when applicable
 */
export async function handleE2bWebhook(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string | undefined,
): Promise<HandleE2bWebhookResult> {
  // ── 1. Signature verification ──────────────────
  if (webhookSecret) {
    if (!signatureHeader) {
      return {
        success: false,
        eventId: null,
        error: "Missing e2b-signature header",
      };
    }

    const valid = verifyE2bSignature(webhookSecret, rawBody, signatureHeader);
    if (!valid) {
      return {
        success: false,
        eventId: null,
        error: "Invalid webhook signature",
      };
    }
  }

  // ── 2. Parse payload ───────────────────────────
  let payload: E2bWebhookPayload;
  try {
    const json: unknown = JSON.parse(rawBody);
    payload = e2bWebhookPayloadSchema.parse(json);
  } catch (error) {
    return {
      success: false,
      eventId: null,
      error:
        "Invalid webhook payload " +
        (error instanceof Error ? error.message : ""),
    };
  }

  // ── 3. Persist sandbox event (idempotent) ──────
  const eventData = payload.event_data;

  try {
    await db
      .insert(sandboxEvent)
      .values({
        e2bEventId: payload.id,
        sandboxId: payload.sandbox_id,
        sandboxExecutionId: payload.sandbox_execution_id ?? null,
        sandboxTemplateId: payload.sandbox_template_id ?? null,
        sandboxBuildId: payload.sandbox_build_id ?? null,
        sandboxTeamId: payload.sandbox_team_id ?? null,
        type: payload.type,
        sandboxMetadata: eventData.sandbox_metadata ?? null,
        executionStartedAt: eventData.execution?.started_at
          ? new Date(eventData.execution.started_at)
          : null,
        executionVcpuCount: eventData.execution?.vcpu_count ?? null,
        executionMemoryMb: eventData.execution?.memory_mb ?? null,
        executionTimeMs: eventData.execution?.execution_time ?? null,
        eventTimestamp: new Date(payload.timestamp),
      })
      .onConflictDoNothing({ target: sandboxEvent.e2bEventId });
  } catch (error) {
    return {
      success: false,
      eventId: null,
      error:
        "DB insert failed: " + (error instanceof Error ? error.message : ""),
    };
  }

  // ── 4. Update agentSession status ──────────────
  const newSessionStatus = EVENT_TO_SESSION_STATUS[payload.type];

  if (newSessionStatus) {
    await db
      .update(agentSession)
      .set({
        status: newSessionStatus,
        updatedAt: new Date(),
        ...(payload.type === "sandbox.lifecycle.killed" && eventData.execution
          ? { durationMs: eventData.execution.execution_time }
          : {}),
      })
      .where(eq(agentSession.sandboxId, payload.sandbox_id));
  }

  // ── 5. Update project sandbox status ──────────
  // Uses a separate mapping aligned with SandboxStatus ("active"|"paused"|"destroyed").
  const newProjectStatus = EVENT_TO_PROJECT_STATUS[payload.type];

  if (newProjectStatus) {
    const projectIdFromMeta = eventData.sandbox_metadata?.projectId;

    if (projectIdFromMeta) {
      // Direct lookup by project.id from sandbox metadata — reliable for all events,
      // including `created` where sandboxId is not yet written to the project row.
      await db
        .update(project)
        .set({
          // On `created`, also stamp the sandboxId so it's available immediately
          ...(payload.type === "sandbox.lifecycle.created"
            ? { sandboxId: payload.sandbox_id }
            : {}),
          sandboxStatus: newProjectStatus,
          updatedAt: new Date(),
        })
        .where(eq(project.id, projectIdFromMeta));
    } else {
      // Fallback for sandboxes created without metadata (dev-server path or old rows)
      await db
        .update(project)
        .set({ sandboxStatus: newProjectStatus, updatedAt: new Date() })
        .where(eq(project.sandboxId, payload.sandbox_id));
    }
  }

  return { success: true, eventId: payload.id };
}
