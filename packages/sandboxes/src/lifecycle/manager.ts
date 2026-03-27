// ──────────────────────────��────────────────────────────���─────────────────────
// SandboxLifecycleManager
//
// Orchestrates sandbox create/resume/connect using the `project` table as
// the source of truth. Handles both E2B and Daytona providers, env var
// injection, subdomain/ngrok URL management, and concurrency tracking.
// ─────────────────────���────────────────────────────��──────────────────────────

import type { BaseSandbox } from "deepagents";

import { env } from "../../env";
import { buildSandboxEnvVars } from "../constants/sandbox-env";
import { getTimeoutForUserTier } from "../constants/timeouts";
import { assertConcurrencyLimit, incrementActiveCount, decrementActiveCount } from "../concurrency";
import { DaytonaSandboxBackend } from "../providers/daytona";
import { E2BSandboxBackend } from "../providers/e2b";
import { resolveSandbox } from "../router";
import type {
	LifecycleOptions,
	LifecycleResult,
	SandboxProvider,
} from "../types";
import { isSandboxNotFoundError } from "../utils/error-detection";
import { getExpoSubdomain } from "../utils/subdomain";
import {
	getProjectSandboxState,
	updateProjectSandboxState,
} from "./project-sync";

// ��──────────────────────────────���────────────────────────────���────────────────
// Public API
// ─���───────────────────────────────────────────────���───────────────────────────

/**
 * Resolves a sandbox for a project, using the `project` table to determine
 * whether to reconnect to an existing sandbox or create a new one.
 *
 * Flow:
 * 1. Load project → check `sandboxId` + `sandboxStatus`
 * 2. If active sandbox exists → try reconnect (E2B or Daytona)
 * 3. On "not found" → clear stale state, fall through to create
 * 4. If no sandbox → delegate to `resolveSandbox()` for classification
 * 5. After acquisition → update project with sandboxId, status, subdomain, ngrokUrl
 *
 * Returns `null` when no sandbox providers are configured.
 */
export async function resolveProjectSandbox(
	options: LifecycleOptions,
): Promise<LifecycleResult | null> {
	const { projectId, sessionId, orgId, hints = {}, userTier = "FREE" } = options;
	const acquiredAt = Date.now();

	// Enforce per-org concurrency limit before any provisioning
	if (orgId) await assertConcurrencyLimit(orgId);

	// Load current project state
	const projectState = await getProjectSandboxState(projectId);
	const subdomain = getExpoSubdomain(projectState.name);
	const timeoutMs = getTimeoutForUserTier(userTier);

	// ── 1. Try reconnecting to an existing active sandbox ─────────────────────
	if (projectState.sandboxId && projectState.sandboxStatus === "active") {
		const reconnected = await tryReconnect(
			projectState.sandboxId,
			projectId,
			subdomain,
			timeoutMs,
		);

		if (reconnected) {
			// Track concurrency
			if (orgId) incrementActiveCount(orgId);

			return {
				...reconnected,
				acquiredAt,
			};
		}

		// Reconnect failed — stale state already cleared inside tryReconnect
	}

	// ── 2. Try reconnecting to a paused sandbox ──────────────────────────────
	if (projectState.sandboxId && projectState.sandboxStatus === "paused") {
		const resumed = await tryReconnect(
			projectState.sandboxId,
			projectId,
			subdomain,
			timeoutMs,
		);

		if (resumed) {
			if (orgId) incrementActiveCount(orgId);

			return {
				...resumed,
				acquiredAt,
			};
		}
	}

	// ── 3. Create a new sandbox via the existing router ──────────���───────────
	const providerOverride = options.provider ?? hints.provider;

	// Build env vars for the new sandbox
	const hasE2B = Boolean(env.E2B_API_KEY);
	const anticipatedProvider: SandboxProvider = providerOverride
		?? (hasE2B ? "e2b" : "daytona");

	const sandboxEnvVars = buildSandboxEnvVars({
		subdomain,
		provider: anticipatedProvider,
		extraEnv: hints.envVars,
		ngrokAuthToken: env.NGROK_AUTHTOKEN ?? undefined,
	});

	const resolved = await resolveSandbox({
		projectId,
		sessionId,
		orgId,
		hints: {
			...hints,
			envVars: sandboxEnvVars,
			provider: providerOverride,
		},
	});

	if (!resolved) return null;

	// ── 4. Persist sandbox state to project ────��─────────────────────────────
	const ngrokUrl = computeNgrokUrl(subdomain, resolved.provider);

	await updateProjectSandboxState(projectId, {
		sandboxId: resolved.id,
		sandboxStatus: "active",
		subdomain,
		ngrokUrl,
	});

	// Note: concurrency increment is handled inside resolveSandbox() by the
	// provisioning functions (provisionE2B/provisionDaytona). No increment here.

	console.info(
		`[lifecycle] ${sessionId}: Sandbox provisioned ` +
		`(provider=${resolved.provider}, id=${resolved.id}, subdomain=${subdomain})`,
	);

	return {
		...resolved,
		subdomain,
		ngrokUrl: ngrokUrl ?? undefined,
		acquiredAt,
	};
}

/**
 * Pauses a sandbox — keeps it alive but marks it as paused in the project.
 *
 * - E2B: Extends timeout via `keepAlive()` so it survives the pause.
 * - Daytona: Calls `stop()` which archives the sandbox for later resume.
 */
export async function pauseProjectSandbox(
	projectId: string,
	sandbox: LifecycleResult,
	orgId?: string,
): Promise<void> {
	try {
		if (sandbox.provider === "e2b") {
			const backend = sandbox.instance as unknown as { keepAlive?: (s: number) => Promise<void> };
			if (typeof backend.keepAlive === "function") {
				await backend.keepAlive(600); // 10 min grace period
			}
		}
		// Daytona sandboxes stay alive — the pool or auto-stop handles them
	} catch (err) {
		console.warn(`[lifecycle] Failed to pause sandbox ${sandbox.id}:`, err);
	}

	await updateProjectSandboxState(projectId, {
		sandboxStatus: "paused",
	});

	if (orgId) decrementActiveCount(orgId);

	console.info(`[lifecycle] Sandbox paused (project=${projectId}, id=${sandbox.id})`);
}

/**
 * Destroys a sandbox — permanently deletes it and clears project state.
 */
export async function destroyProjectSandbox(
	projectId: string,
	sandbox: LifecycleResult,
	orgId?: string,
): Promise<void> {
	try {
		const instance = sandbox.instance as unknown as { close?: () => Promise<void> };
		await instance.close?.();
	} catch (err) {
		console.warn(`[lifecycle] Failed to close sandbox ${sandbox.id}:`, err);
	}

	await updateProjectSandboxState(projectId, {
		sandboxId: null,
		sandboxStatus: "destroyed",
		ngrokUrl: null,
	});

	if (orgId) decrementActiveCount(orgId);

	console.info(`[lifecycle] Sandbox destroyed (project=${projectId}, id=${sandbox.id})`);
}

/**
 * Releases concurrency tracking for an org without modifying project state.
 * Call this in `finally` blocks when the lifecycle methods above aren't used.
 */
export function releaseSandbox(orgId?: string): void {
	if (orgId) decrementActiveCount(orgId);
}

// ───────��─────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────��────────────���──────────────────────────────────────────────────────────

/**
 * Attempts to reconnect to an existing sandbox by ID.
 * Returns `LifecycleResult` on success, `null` on failure.
 * On "not found" errors, clears the stale sandbox state from the project.
 */
async function tryReconnect(
	sandboxId: string,
	projectId: string,
	subdomain: string,
	timeoutMs: number,
): Promise<Omit<LifecycleResult, "acquiredAt"> | null> {
	// Determine provider by trying E2B first (most common), then Daytona
	const hasE2B = Boolean(env.E2B_API_KEY);
	const hasDaytona = Boolean(env.DAYTONA_API_KEY);

	// Try E2B reconnect
	if (hasE2B) {
		try {
			const backend = await E2BSandboxBackend.connect(sandboxId, { timeoutMs });
			const ngrokUrl = computeNgrokUrl(subdomain, "e2b");

			await updateProjectSandboxState(projectId, {
				sandboxStatus: "active",
				subdomain,
				ngrokUrl,
			});

			return {
				instance: backend as unknown as BaseSandbox,
				provider: "e2b",
				id: backend.id,
				shouldClose: false, // Reconnected — don't auto-close
				complexity: { tier: "moderate", score: 30, reasons: ["reconnected existing E2B sandbox"] },
				subdomain,
				ngrokUrl: ngrokUrl ?? undefined,
			};
		} catch (err) {
			if (isSandboxNotFoundError(err)) {
				console.info(`[lifecycle] E2B sandbox ${sandboxId} not found, clearing stale state`);
				await updateProjectSandboxState(projectId, {
					sandboxId: null,
					sandboxStatus: null,
					ngrokUrl: null,
				});
				return null;
			}

			// Not a "not found" error — might be a Daytona sandbox ID
			if (hasDaytona) {
				// Fall through to Daytona
			} else {
				console.warn(`[lifecycle] E2B reconnect failed for ${sandboxId}:`, err);
				await updateProjectSandboxState(projectId, {
					sandboxId: null,
					sandboxStatus: null,
					ngrokUrl: null,
				});
				return null;
			}
		}
	}

	// Try Daytona reconnect
	if (hasDaytona) {
		try {
			const backend = await DaytonaSandboxBackend.reconnect(sandboxId);
			const ngrokUrl = computeNgrokUrl(subdomain, "daytona");

			await updateProjectSandboxState(projectId, {
				sandboxStatus: "active",
				subdomain,
				ngrokUrl,
			});

			return {
				instance: backend.instance as unknown as BaseSandbox,
				provider: "daytona",
				id: backend.id,
				shouldClose: false,
				complexity: { tier: "complex", score: 50, reasons: ["reconnected existing Daytona sandbox"] },
				subdomain,
				ngrokUrl: ngrokUrl ?? undefined,
			};
		} catch (err) {
			if (isSandboxNotFoundError(err)) {
				console.info(`[lifecycle] Daytona sandbox ${sandboxId} not found, clearing stale state`);
			} else {
				console.warn(`[lifecycle] Daytona reconnect failed for ${sandboxId}:`, err);
			}

			await updateProjectSandboxState(projectId, {
				sandboxId: null,
				sandboxStatus: null,
				ngrokUrl: null,
			});
			return null;
		}
	}

	// No providers available
	return null;
}

/**
 * Computes the public ngrok URL for a sandbox preview.
 * Only applicable to E2B sandboxes (Daytona has its own URL mechanism).
 * Returns `null` if ngrok is not configured or provider is Daytona.
 */
function computeNgrokUrl(subdomain: string, provider: SandboxProvider): string | null {
	if (provider !== "e2b") return null;
	if (!env.NGROK_AUTHTOKEN) return null;
	return `https://${subdomain}.ngrok.app`;
}
