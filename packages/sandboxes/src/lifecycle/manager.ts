// ─────────────────────────────────────────────────────────────────────────────
// SandboxLifecycleManager
//
// Orchestrates sandbox create/resume/connect using the `project` table as
// the source of truth. Handles both E2B and Daytona providers, env var
// injection, subdomain/ngrok URL management, and concurrency tracking.
//
// ngrok custom domain strategy
// ─────────────────────────────
// Every project gets a deterministic, stable public URL:
//   https://{projectId}.ngrok.dev
//
// This requires:
//   1. A paid ngrok account with the domain registered.
//   2. NGROK_AUTHTOKEN set in the server environment.
//
// The tunnel is started with:
//   ngrok http --domain={projectId}.ngrok.dev 8081
//
// On reconnect the same domain is reused — no URL churn between sessions.
// ─────────────────────────────────────────────────────────────────────────────

import type { BaseSandbox } from "deepagents";

import { env } from "../../env";
import { assertConcurrencyLimit, decrementActiveCount, incrementActiveCount } from "../concurrency";
import { buildSandboxEnvVars } from "../constants/sandbox-env";
import { CONTAINER_TIMEOUTS, getTimeoutForUserTier } from "../constants/timeouts";
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
	withProjectSandboxLock,
} from "./project-sync";

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves a sandbox for a project, using the `project` table to determine
 * whether to reconnect to an existing sandbox or create a new one.
 *
 * Flow:
 * 1. Load project → check `sandboxId` + `sandboxStatus`
 * 2. If active sandbox exists → try reconnect (E2B or Daytona)
 * 3. On "not found" → clear stale state, fall through to create
 * 4. If no sandbox → delegate to `resolveSandbox()` for classification
 * 5. After acquisition → start ngrok with custom domain, verify URL, persist
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

	// Serialize all sandbox resolution for this project so concurrent agent runs
	// can't both create sandboxes and orphan each other's state.
	return withProjectSandboxLock(projectId, async () => {
		// Load current project state (inside the lock so we see committed writes)
		const projectState = await getProjectSandboxState(projectId);
		const subdomain = getExpoSubdomain(projectState.name);
		const timeoutMs = getTimeoutForUserTier(userTier);

		// Deterministic custom domain — stable across sessions for this project
		const ngrokDomain = `${projectId}.ngrok.dev`;

		// ── 1. Try reconnecting to an existing active or paused sandbox ──────────
		if (
			projectState.sandboxId &&
			(projectState.sandboxStatus === "active" ||
				projectState.sandboxStatus === "paused")
		) {
			const reconnected = await tryReconnect(
				projectState.sandboxId,
				projectState.sandboxProvider,
				projectId,
				ngrokDomain,
				subdomain,
				timeoutMs,
			);

			if (reconnected) {
				if (orgId) incrementActiveCount(orgId);
				return { ...reconnected, acquiredAt };
			}

			// Reconnect failed — stale state already cleared inside tryReconnect
		}

		// ── 2. Create a new sandbox via the router ───────────────────────────────
		const providerOverride = options.provider ?? hints.provider;

		const hasE2B = Boolean(env.E2B_API_KEY);
		const anticipatedProvider: SandboxProvider = providerOverride
			?? (hasE2B ? "e2b" : "daytona");

		const sandboxEnvVars = buildSandboxEnvVars({
			subdomain,
			projectId,
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

		// ── 3. Start ngrok with custom domain and verify the live URL ────────────
		// The sandbox's start_cmd (e2b.toml) launches Expo web on port 8081.
		// Wait 12 s for Metro to compile before opening the ngrok tunnel.
		let ngrokUrl: string | null = null;

		if (resolved.provider === "e2b" && env.NGROK_AUTHTOKEN) {
			await new Promise<void>((r) => setTimeout(r, 12_000));
			ngrokUrl = await startNgrokAndGetUrl(resolved.instance, projectId, ngrokDomain);
		}

		// ── 4. Persist sandbox state to project ──────────────────────────────────
		await updateProjectSandboxState(projectId, {
			sandboxId: resolved.id,
			sandboxProvider: resolved.provider,
			sandboxStatus: "active",
			subdomain,
			ngrokUrl,
		});

		console.info(
			`[lifecycle] ${sessionId}: Sandbox provisioned ` +
			`(provider=${resolved.provider}, id=${resolved.id}, subdomain=${subdomain}, ` +
			`ngrokUrl=${ngrokUrl ?? "none"})`,
		);

		return {
			...resolved,
			subdomain,
			ngrokUrl: ngrokUrl ?? undefined,
			acquiredAt,
		};
	});
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
				await backend.keepAlive(CONTAINER_TIMEOUTS.PAUSE / 1_000); // 1 hour grace period
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
		sandboxProvider: null,
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

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempts to reconnect to an existing sandbox by ID.
 *
 * Uses `knownProvider` (persisted on `project.sandboxProvider`) to go direct
 * to the correct backend. Falls back to probing both when the provider is
 * unknown (legacy rows written before the column existed).
 *
 * Returns `LifecycleResult` on success, `null` on failure. On "not found"
 * errors, clears the stale sandbox state from the project.
 */
async function tryReconnect(
	sandboxId: string,
	knownProvider: SandboxProvider | null,
	projectId: string,
	ngrokDomain: string,
	subdomain: string,
	timeoutMs: number,
): Promise<Omit<LifecycleResult, "acquiredAt"> | null> {
	const hasE2B = Boolean(env.E2B_API_KEY);
	const hasDaytona = Boolean(env.DAYTONA_API_KEY);

	// Determine attempt order based on what we know about the sandbox.
	// Legacy rows without a stored provider probe both.
	const attempts: SandboxProvider[] = knownProvider
		? [knownProvider]
		: ["e2b", "daytona"];

	for (const provider of attempts) {
		if (provider === "e2b" && hasE2B) {
			const result = await tryReconnectE2B(
				sandboxId,
				projectId,
				ngrokDomain,
				subdomain,
				timeoutMs,
			);
			if (result.status === "ok") return result.value;
			if (result.status === "not_found") return null;
			// "other_error": only fall through to Daytona when provider was unknown
		}

		if (provider === "daytona" && hasDaytona) {
			const result = await tryReconnectDaytona(
				sandboxId,
				projectId,
				subdomain,
			);
			if (result.status === "ok") return result.value;
			if (result.status === "not_found") return null;
		}
	}

	// All known attempts exhausted — clear the stale state.
	await updateProjectSandboxState(projectId, {
		sandboxId: null,
		sandboxProvider: null,
		sandboxStatus: null,
		ngrokUrl: null,
	});
	return null;
}

type ReconnectOutcome =
	| { status: "ok"; value: Omit<LifecycleResult, "acquiredAt"> }
	| { status: "not_found" }
	| { status: "other_error"; error: unknown };

async function tryReconnectE2B(
	sandboxId: string,
	projectId: string,
	ngrokDomain: string,
	subdomain: string,
	timeoutMs: number,
): Promise<ReconnectOutcome> {
	try {
		const backend = await E2BSandboxBackend.connect(sandboxId, { timeoutMs });

		// Restart (or re-verify) the tunnel using the same custom domain.
		// Even on reconnect the domain never changes — no URL churn.
		let ngrokUrl: string | null = null;
		if (env.NGROK_AUTHTOKEN) {
			ngrokUrl = await startNgrokAndGetUrl(
				backend as unknown as BaseSandbox,
				projectId,
				ngrokDomain,
			);
		}

		await updateProjectSandboxState(projectId, {
			sandboxProvider: "e2b",
			sandboxStatus: "active",
			subdomain,
			ngrokUrl,
		});

		return {
			status: "ok",
			value: {
				instance: backend as unknown as BaseSandbox,
				provider: "e2b",
				id: backend.id,
				shouldClose: false,
				complexity: {
					tier: "moderate",
					score: 30,
					reasons: ["reconnected existing E2B sandbox"],
				},
				subdomain,
				ngrokUrl: ngrokUrl ?? undefined,
			},
		};
	} catch (err) {
		if (isSandboxNotFoundError(err)) {
			console.info(`[lifecycle] E2B sandbox ${sandboxId} not found, clearing stale state`);
			await updateProjectSandboxState(projectId, {
				sandboxId: null,
				sandboxProvider: null,
				sandboxStatus: null,
				ngrokUrl: null,
			});
			return { status: "not_found" };
		}
		console.warn(`[lifecycle] E2B reconnect failed for ${sandboxId}:`, err);
		return { status: "other_error", error: err };
	}
}

async function tryReconnectDaytona(
	sandboxId: string,
	projectId: string,
	subdomain: string,
): Promise<ReconnectOutcome> {
	try {
		const backend = await DaytonaSandboxBackend.reconnect(sandboxId);

		// Daytona has its own URL mechanism — no ngrok needed
		await updateProjectSandboxState(projectId, {
			sandboxProvider: "daytona",
			sandboxStatus: "active",
			subdomain,
			ngrokUrl: null,
		});

		return {
			status: "ok",
			value: {
				instance: backend.instance as unknown as BaseSandbox,
				provider: "daytona",
				id: backend.id,
				shouldClose: false,
				complexity: {
					tier: "complex",
					score: 50,
					reasons: ["reconnected existing Daytona sandbox"],
				},
				subdomain,
				ngrokUrl: undefined,
			},
		};
	} catch (err) {
		if (isSandboxNotFoundError(err)) {
			console.info(`[lifecycle] Daytona sandbox ${sandboxId} not found, clearing stale state`);
			await updateProjectSandboxState(projectId, {
				sandboxId: null,
				sandboxProvider: null,
				sandboxStatus: null,
				ngrokUrl: null,
			});
			return { status: "not_found" };
		}
		console.warn(`[lifecycle] Daytona reconnect failed for ${sandboxId}:`, err);
		return { status: "other_error", error: err };
	}
}

/**
 * Configures ngrok auth, kills any stale tunnel, starts a fresh tunnel on
 * port 8081 using the deterministic custom domain ({projectId}.ngrok.dev),
 * waits for the tunnel to be confirmed live, persists the URL to the project
 * row, and returns the final URL.
 *
 * The --url flag pins the tunnel to a fixed domain so the URL never changes
 * between sandbox restarts or agent session reconnects.
 *
 * Requires:
 *  - NGROK_AUTHTOKEN set in the server environment
 *  - The domain `{projectId}.ngrok.dev` registered on the ngrok account
 */
async function startNgrokAndGetUrl(
	sandbox: BaseSandbox,
	projectId: string,
	ngrokDomain: string,
): Promise<string | null> {
	const expectedUrl = `https://${ngrokDomain}`;
	const tag = `[ngrok:${projectId.slice(0, 8)}]`;

	console.log(`${tag} ── starting ngrok setup for domain: ${ngrokDomain}`);

	// Step 1: Configure auth token inside the sandbox (required for custom domains).
	console.log(`${tag} step 1/4 configuring authtoken…`);
	try {
		await sandbox.execute(
			`ngrok config add-authtoken ${env.NGROK_AUTHTOKEN} 2>/dev/null || true`,
		);
	} catch (err) {
		console.warn(`${tag} authtoken config failed (non-fatal):`, err);
	}

	// Step 2: Kill any existing ngrok to avoid port/domain conflicts.
	console.log(`${tag} step 2/4 killing stale ngrok…`);
	const bgSandbox0 = sandbox as unknown as { startBackground?: (cmd: string) => Promise<void> };
	try {
		if (typeof bgSandbox0.startBackground === "function") {
			await bgSandbox0.startBackground("pkill -9 ngrok 2>/dev/null; true");
		} else {
			await sandbox.execute("pkill -9 ngrok 2>/dev/null || true");
		}
	} catch {
		// ignore — no stale ngrok is fine
	}
	await new Promise<void>((r) => setTimeout(r, 1_500));

	// Step 3: Start ngrok with the fixed custom domain.
	const ngrokCmd = `ngrok http --domain=${ngrokDomain} 8081 --log=stdout > /tmp/ngrok.log 2>&1`;
	console.log(`${tag} step 3/4 launching ngrok daemon…`);
	const bgSandbox = sandbox as unknown as { startBackground?: (cmd: string) => Promise<void> };
	if (typeof bgSandbox.startBackground === "function") {
		await bgSandbox.startBackground(ngrokCmd);
	} else {
		await sandbox.execute(`${ngrokCmd} &`);
	}

	// Give ngrok 3 seconds to bind before polling
	await new Promise<void>((r) => setTimeout(r, 3_000));

	// Step 4: Poll the local ngrok API until the tunnel is confirmed live
	console.log(`${tag} step 4/4 polling for tunnel on ${expectedUrl}…`);
	const url = await fetchLiveNgrokUrl(sandbox, expectedUrl, tag);

	// Persist and report
	if (url) {
		await updateProjectSandboxState(projectId, { ngrokUrl: url });
		console.info(`${tag} ✔ tunnel live → ${url}`);
	} else {
		let ngrokLog = "(could not read log)";
		try {
			const logResult = await sandbox.execute("tail -30 /tmp/ngrok.log 2>/dev/null || echo 'no log'");
			ngrokLog = logResult.output;
		} catch { /* ignore */ }
		console.warn(
			`${tag} ✖ tunnel did not come up for domain '${ngrokDomain}'\n` +
			`  → ensure the domain is reserved on your ngrok account\n` +
			`  → ngrok log:\n${ngrokLog}`,
		);
	}

	return url;
}

/**
 * Polls the ngrok local API inside the sandbox until the tunnel is live.
 * Expects the tunnel public_url to match `expectedUrl` ({projectId}.ngrok.dev).
 * Retries every 2 seconds for up to 30 seconds.
 * Returns null if the tunnel does not come up in time.
 */
async function fetchLiveNgrokUrl(
	sandbox: BaseSandbox,
	expectedUrl: string,
	tag: string,
): Promise<string | null> {
	const MAX_ATTEMPTS = 15;
	const INTERVAL_MS = 2_000;

	for (let i = 0; i < MAX_ATTEMPTS; i++) {
		console.log(`${tag} poll ${i + 1}/${MAX_ATTEMPTS} waiting for ${expectedUrl}…`);
		try {
			const result = await sandbox.execute(
				"curl -s http://localhost:4040/api/tunnels 2>/dev/null",
			);

			if (result.exitCode === 0 && result.output) {
				try {
					const data = JSON.parse(result.output) as {
						tunnels?: Array<{ public_url: string; proto: string }>;
					};
					console.log(`${tag} poll ${i + 1} tunnels: ${JSON.stringify(data.tunnels?.map((t) => t.public_url))}`);
					const httpsTunnel = data.tunnels?.find(
						(t) => t.proto === "https" && t.public_url === expectedUrl,
					);
					if (httpsTunnel?.public_url) {
						return httpsTunnel.public_url;
					}
				} catch {
					console.log(`${tag} poll ${i + 1} ngrok API not ready yet (JSON parse failed)`);
				}
			} else {
				console.log(`${tag} poll ${i + 1} ngrok API not reachable (exit=${result.exitCode})`);
			}
		} catch (err) {
			console.log(`${tag} poll ${i + 1} execute error:`, err);
		}

		await new Promise<void>((r) => setTimeout(r, INTERVAL_MS));
	}

	return null;
}
