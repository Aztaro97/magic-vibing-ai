// `resolveSandbox` is the single entry point for all sandbox provisioning
// in Magic Vibing AI. The tRPC agent.run procedure calls this once per session.
//
// Decision flow:
//
//  resolveSandbox(options)
//       │
//       ├─ existingId provided? → reconnect to existing sandbox
//       │
//       ├─ classify task → ComplexityScore + provider decision
//       │
//       ├─ provider = "e2b"     → E2BSandboxBackend.create()
//       │
//       └─ provider = "daytona" → acquireFromPool() || DaytonaSandboxBackend.create()
//                                       └─ after run: returnToPool()

import type { BaseSandbox } from "deepagents";

import { env } from "../env";
import { classifyTask, pickProvider } from "./classifier";
import { assertConcurrencyLimit, decrementActiveCount, incrementActiveCount } from "./concurrency";
import { acquireFromPool } from "./pool";
import { DaytonaSandboxBackend } from "./providers/daytona";
import { E2BSandboxBackend } from "./providers/e2b";
import { assertSandboxOwnership } from "./tenant-guard";
import type {
	ResolvedSandbox,
	SandboxProvider,
	SandboxRouterOptions,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the right sandbox for an agent run, creating or reconnecting
 * as needed based on task complexity and configuration.
 *
 * Returns `null` when both E2B and Daytona API keys are missing (filesystem-
 * only mode — agents run without `execute` tool access).
 *
 * @example
 * ```ts
 * const sandbox = await resolveSandbox({
 *   projectId,
 *   sessionId,
 *   orgId: ctx.orgId!,
 *   hints: { description: userMessage, requiresGit: true },
 * });
 *
 * const agent = createMagicVibingAgent({ sandbox: sandbox?.instance });
 * ```
 */
export async function resolveSandbox(
	options: SandboxRouterOptions,
): Promise<ResolvedSandbox | null> {
	const {
		projectId,
		sessionId,
		hints = {},
		existingId,
		existingProvider,
	} = options;

	const acquiredAt = Date.now();

	// ── 0. No sandbox keys configured — filesystem-only mode ─────────────────
	const hasE2B = Boolean(env.E2B_API_KEY);
	const hasDaytona = Boolean(env.DAYTONA_API_KEY);

	if (!hasE2B && !hasDaytona) {
		console.warn(
			"[sandbox-router] Neither E2B_API_KEY nor DAYTONA_API_KEY is set. " +
			"Agent will run in filesystem-only mode (no shell execute tool).",
		);
		return null;
	}

	// ── 1. Reconnect to an existing sandbox (HITL resume, Inngest retry) ─────
	if (existingId && existingProvider) {
		return reconnectExisting(existingId, existingProvider, options.orgId!, projectId, acquiredAt);
	}

	// ── 1b. Enforce per-org concurrency limit ────────────────────────────────
	if (options.orgId) {
		await assertConcurrencyLimit(options.orgId);
	}

	// ── 2. Classify task complexity ──────────────────────────────────────────
	const complexity = classifyTask(hints);
	let provider = pickProvider(complexity);

	log(sessionId, complexity, provider);

	// ── 3. Fall back if requested provider is unavailable ────────────────────
	if (provider === "e2b" && !hasE2B) {
		console.warn(
			`[sandbox-router] ${sessionId}: E2B unavailable, falling back to Daytona`,
		);
		provider = "daytona";
	}
	if (provider === "daytona" && !hasDaytona) {
		console.warn(
			`[sandbox-router] ${sessionId}: Daytona unavailable, falling back to E2B`,
		);
		provider = "e2b";
	}

	// ── 4. Provision sandbox ─────────────────────────────────────────────────
	if (provider === "e2b") {
		return provisionE2B({
			projectId,
			sessionId,
			hints,
			complexity,
			acquiredAt,
		});
	} else {
		return provisionDaytona({
			projectId,
			sessionId,
			hints,
			complexity,
			acquiredAt,
		});
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider provisioning
// ─────────────────────────────────────────────────────────────────────────────

async function provisionE2B(ctx: ProvisionContext): Promise<ResolvedSandbox> {
	const { projectId, sessionId, hints, complexity, acquiredAt } = ctx;

	// E2B timeout: clamp to SANDBOX_TIMEOUT_SECONDS or task estimate + buffer
	const configuredTimeout = Number(env.SANDBOX_TIMEOUT_SECONDS ?? 300);
	const taskTimeout = hints.estimatedDurationSeconds
		? Math.min(hints.estimatedDurationSeconds * 1.5, configuredTimeout)
		: configuredTimeout;

	// Attach projectId + sessionId as sandbox metadata so E2B lifecycle webhooks
	// can look up the project row before sandboxId is written to the DB.
	const sandboxMetadata: Record<string, string> = { projectId, sessionId };

	const backend = await E2BSandboxBackend.create(hints, Math.ceil(taskTimeout), undefined, sandboxMetadata);

	// Track concurrency for the org
	if (ctx.orgId) incrementActiveCount(ctx.orgId);

	console.info(
		`[sandbox-router] ${sessionId}: E2B sandbox provisioned in ${Date.now() - acquiredAt}ms ` +
		`(id=${backend.id}, tier=${complexity.tier})`,
	);

	return {
		instance: backend as unknown as BaseSandbox,
		provider: "e2b",
		id: backend.id,
		shouldClose: true, // E2B sandboxes are ephemeral — always close after run
		complexity,
		acquiredAt,
	};
}

async function provisionDaytona(
	ctx: ProvisionContext,
): Promise<ResolvedSandbox> {
	const { projectId, sessionId, hints, complexity, acquiredAt } = ctx;

	// ── 4a. Try the pool first ───────────────────────────────────────────────
	const pooled = await acquireFromPool(projectId);
	if (pooled) {
		if (ctx.orgId) incrementActiveCount(ctx.orgId);

		console.info(
			`[sandbox-router] ${sessionId}: Daytona sandbox resumed from pool in ` +
			`${Date.now() - acquiredAt}ms (id=${pooled.id})`,
		);
		return {
			instance: pooled.instance as unknown as BaseSandbox,
			provider: "daytona",
			id: pooled.id,
			shouldClose: false, // Managed by the pool — don't close, return to pool
			complexity,
			acquiredAt,
		};
	}

	// ── 4b. Create a fresh Daytona sandbox ───────────────────────────────────
	const backend = await DaytonaSandboxBackend.create(complexity.tier, hints, {
		orgId: ctx.orgId ?? "default-org",
		projectId,
		sessionId,
	});

	if (ctx.orgId) incrementActiveCount(ctx.orgId);

	console.info(
		`[sandbox-router] ${sessionId}: Daytona sandbox created in ` +
		`${Date.now() - acquiredAt}ms ` +
		`(id=${backend.id}, tier=${complexity.tier}, ` +
		`reasons=[${complexity.reasons.slice(0, 3).join(", ")}])`,
	);

	return {
		instance: backend.instance as unknown as BaseSandbox,
		provider: "daytona",
		id: backend.id,
		shouldClose: true,
		complexity,
		acquiredAt,
	};
}

async function reconnectExisting(
	sandboxId: string,
	provider: SandboxProvider,
	orgId: string,
	projectId: string,
	acquiredAt: number,
): Promise<ResolvedSandbox> {
	if (provider === "daytona") {
		// Validate ownership before reconnecting
		await assertSandboxOwnership(sandboxId, orgId, projectId);

		const backend = await DaytonaSandboxBackend.reconnect(sandboxId);
		return {
			instance: backend.instance as unknown as BaseSandbox,
			provider: "daytona",
			id: backend.id,
			shouldClose: false,
			complexity: {
				tier: "complex",
				score: 50,
				reasons: ["reconnected existing sandbox"],
			},
			acquiredAt,
		};
	}

	// E2B sandboxes can't be reconnected by ID from a separate process — they
	// are identified by their kernel session. Treat as a fresh provision.
	const backend = await E2BSandboxBackend.create({}, 300);
	return {
		instance: backend as unknown as BaseSandbox,
		provider: "e2b",
		id: backend.id,
		shouldClose: true,
		complexity: {
			tier: "simple",
			score: 10,
			reasons: ["E2B reconnect (new sandbox)"],
		},
		acquiredAt,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface ProvisionContext {
	orgId?: string;
	projectId: string;
	sessionId: string;
	hints: import("./types").TaskHints;
	complexity: import("./types").ComplexityScore;
	acquiredAt: number;
}

function log(
	sessionId: string,
	complexity: import("./types").ComplexityScore,
	provider: SandboxProvider,
): void {
	if (env.AGENT_LOG_LEVEL === "debug") {
		console.debug(
			`[sandbox-router] ${sessionId}: score=${complexity.score} tier=${complexity.tier} ` +
			`→ ${provider} | reasons: ${complexity.reasons.join("; ")}`,
		);
	}
}

