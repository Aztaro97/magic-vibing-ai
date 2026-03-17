import { DaytonaSandbox, DaytonaSandboxError } from "@langchain/daytona";

import { env } from "../../env";
import { daytonaResources } from "../classifier";
import { buildLabels, SandboxLabels } from "../labels";
import type { ComplexityTier, TaskHints } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// DaytonaSandboxBackend
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thin adapter over `@langchain/daytona`'s `DaytonaSandbox`.
 *
 * `DaytonaSandbox` already implements `BaseSandbox`, so this adapter's job is:
 * 1. Encapsulate creation options (resources, image, env vars, labels).
 * 2. Expose the sandbox `id` for pool management and DB persistence.
 * 3. Provide a uniform `close()` vs `stop()` distinction:
 *    - `stop()` keeps the sandbox archived (can resume later — cheaper).
 *    - `close()` permanently deletes it.
 * 4. Support `reconnect()` for HITL resume and Inngest retries.
 */
export class DaytonaSandboxBackend {
	private _inner: DaytonaSandbox;

	private constructor(inner: DaytonaSandbox) {
		this._inner = inner;
	}

	/** The native `DaytonaSandbox` instance, usable as a DeepAgents `backend`. */
	get instance(): DaytonaSandbox {
		return this._inner;
	}

	/** Daytona sandbox ID — persist this to resume later. */
	get id(): string {
		return this._inner.id;
	}

	// ── Factory: create a new sandbox ────────────────────────────────────────

	/**
	 * Creates a new Daytona sandbox with resources sized to the task tier.
	 *
	 * @param tier    Complexity tier from the classifier.
	 * @param hints   Task hints used to configure resources, image, env vars.
	 * @param labels  Key/value labels for sandbox pool grouping and bulk cleanup.
	 */
	static async create(
		tier: ComplexityTier,
		hints: TaskHints = {},
		tenantLabels: Pick<SandboxLabels, "orgId" | "projectId" | "sessionId">,
	): Promise<DaytonaSandboxBackend> {
		const resources = daytonaResources(tier, hints);
		const autoStop = env.DAYTONA_AUTO_STOP_INTERVAL ?? 15;
		const image =
			hints.customImage ?? (env.DAYTONA_DEFAULT_IMAGE || "node:20");

		const labels = buildLabels({
			...tenantLabels,
			tier,
			lifecycle: "active",
		});

		const sandbox = await DaytonaSandbox.create({
			language: "typescript",
			image,
			resources: {
				cpu: resources.cpu,
				memory: resources.memory,
				disk: resources.disk,
			},
			envVars: buildEnvVars(hints),
			autoStopInterval: autoStop,
			labels: labels as Record<string, string>,
			target: env.DAYTONA_TARGET,
		});

		return new DaytonaSandboxBackend(sandbox);
	}

	// ── Factory: reconnect to an existing sandbox ─────────────────────────────

	/**
	 * Reconnects to an existing (stopped or running) Daytona sandbox by ID.
	 * Used for HITL resume, Inngest retries, and session continuation.
	 *
	 * Starts the sandbox if it was stopped.
	 */
	static async reconnect(sandboxId: string): Promise<DaytonaSandboxBackend> {
		try {
			// @ts-expect-error - connect method exists at runtime but is missing in types
			const sandbox = await (DaytonaSandbox as any).connect(sandboxId);
			return new DaytonaSandboxBackend(sandbox);
		} catch (err) {
			if (
				err instanceof DaytonaSandboxError &&
				err.code === "NOT_INITIALIZED"
			) {
				throw new Error(
					`Daytona sandbox ${sandboxId} no longer exists. It may have been auto-deleted. ` +
					"Create a new session to start fresh.",
				);
			}
			throw err;
		}
	}

	// ── Lifecycle ────────────────────────────────────────────────────────────

	/**
	 * Stops the sandbox (archived, not deleted). Can be resumed later.
	 * Use this at the end of an agent session when the user might continue.
	 */
	async stop(): Promise<void> {
		await this._inner.stop();
	}

	/**
	 * Permanently deletes the sandbox. Use when the session is definitively done.
	 */
	async close(): Promise<void> {
		await this._inner.close();
	}

	/**
	 * Deletes all sandboxes for a project. Used by Inngest cleanup jobs.
	 */
	static async deleteProjectSandboxes(projectId: string): Promise<void> {
		await DaytonaSandbox.deleteAll({
			app: "magic-vibing-ai",
			projectId,
		});
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merges task-specific env vars with baseline env vars that every agent
 * sandbox should receive (LangSmith, log level, etc.).
 */
function buildEnvVars(hints: TaskHints): Record<string, string> {
	const base: Record<string, string> = {};

	// Forward LangSmith tracing into the sandbox so nested LangChain calls
	// (e.g. code the agent executes that itself uses LangChain) are traced.
	if (env.LANGCHAIN_API_KEY)
		base.LANGCHAIN_API_KEY = env.LANGCHAIN_API_KEY;
	if (env.LANGCHAIN_TRACING_V2)
		base.LANGCHAIN_TRACING_V2 = env.LANGCHAIN_TRACING_V2;
	if (env.LANGCHAIN_PROJECT)
		base.LANGCHAIN_PROJECT = env.LANGCHAIN_PROJECT;
	if (env.AGENT_LOG_LEVEL)
		base.AGENT_LOG_LEVEL = env.AGENT_LOG_LEVEL;

	// Caller-supplied vars win over base vars (allows test overrides)
	return { ...base, ...(hints.envVars ?? {}) };
}
