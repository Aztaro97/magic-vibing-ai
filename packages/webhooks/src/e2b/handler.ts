import { eq } from "drizzle-orm/sql";

import { agentSession } from "@acme/db/agents";
import { db } from "@acme/db/client";
import { sandboxEvent } from "@acme/db/sandbox-event";

import { project } from "@acme/db";
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
			error: "Invalid webhook payload " + (error instanceof Error ? error.message : ""),
		};
	}

	// ── 3. Persist sandbox event (idempotent) ──────
	const execution = payload.event_data;

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
			sandboxMetadata: payload.event_data.sandbox_metadata ?? null,
			executionStartedAt: execution?.execution?.started_at
				? new Date(execution.execution.started_at)
				: null,
			executionVcpuCount: execution?.execution?.vcpu_count ?? null,
			executionMemoryMb: execution?.execution?.memory_mb ?? null,
			executionTimeMs: execution?.execution?.execution_time ?? null,
			eventTimestamp: new Date(payload.timestamp),
		})
		.onConflictDoNothing({ target: sandboxEvent.e2bEventId });

	// ── 4. Update agentSession status ──────────────
	const newStatus = EVENT_TO_SESSION_STATUS[payload.type];
	if (newStatus) {
		await db
			.update(agentSession)
			.set({
				status: newStatus,
				updatedAt: new Date(),
				...(payload.type === "sandbox.lifecycle.killed" && execution
					? { durationMs: execution.execution?.execution_time }
					: {}),
			})
			.where(eq(agentSession.sandboxId, payload.sandbox_id));
	}



	// 5. Update Project Status
	const findProject = await db.query.project.findFirst({
		where: eq(project.sandboxId, payload.sandbox_id),
	});

	if (findProject) {
		await db
			.update(project)
			.set({
				sandboxStatus: newStatus,
				updatedAt: new Date(),
			})
			.where(eq(project.sandboxId, payload.sandbox_id));
	}

	return { success: true, eventId: payload.id };
}
