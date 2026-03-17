//
// In-process Daytona sandbox pool.
//
// Motivation: Daytona sandboxes take ~2–5s to provision from scratch. For
// projects that run agents frequently, pre-warming a small pool of stopped
// sandboxes and resuming them (start() from stopped state: ~500ms) cuts
// perceived latency dramatically.
//
// Architecture:
//  - One pool entry per project (1 warm sandbox ready to resume).
//  - Entries are evicted after POOL_TTL_MS if unused.
//  - The pool is in-process (no Redis). In a multi-replica deployment, each
//    replica maintains its own pool — warm sandboxes are NOT shared across
//    replicas. For cross-replica sharing, replace with a Redis-backed pool.

import { env } from "../env";
import { DaytonaSandboxBackend } from "./providers/daytona.js";
import type { ComplexityTier, PoolEntry } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Pool configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Evict warm entries that have been idle for longer than this. */
const POOL_TTL_MS = 10 * 60 * 1_000; // 10 min

/** Max pool size (one entry per project in this implementation). */
const MAX_ENTRIES = env.SANDBOX_MAX_CONCURRENT_PER_USER ?? 5;

// ─────────────────────────────────────────────────────────────────────────────
// Pool state
// ─────────────────────────────────────────────────────────────────────────────

/** projectId → PoolEntry */
const pool = new Map<string, PoolEntry>();

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempts to acquire a warm sandbox from the pool for the given project.
 *
 * Returns `null` if no warm entry is available — the caller should create
 * a fresh sandbox instead.
 */
export async function acquireFromPool(
	projectId: string,
): Promise<DaytonaSandboxBackend | null> {
	evictExpired();

	const entry = pool.get(projectId);
	if (!entry || entry.inUse) return null;

	// Mark in-use immediately to prevent double-acquisition
	entry.inUse = true;
	entry.lastUsedAt = Date.now();

	try {
		const backend = await DaytonaSandboxBackend.reconnect(entry.sandboxId);
		return backend;
	} catch (err) {
		// Sandbox was deleted externally (auto-archive TTL expired, etc.)
		pool.delete(projectId);
		console.warn(
			`[sandbox-pool] Warm entry for project ${projectId} is gone: ${String(err)}`,
		);
		return null;
	}
}

/**
 * Returns a sandbox to the pool after an agent run completes.
 *
 * The sandbox is stopped (archived, not deleted) so it can be quickly
 * resumed for the next run. If the pool is full, the sandbox is deleted.
 */
export async function returnToPool(
	projectId: string,
	backend: DaytonaSandboxBackend,
): Promise<void> {
	evictExpired();

	const existingEntry = pool.get(projectId);
	const isFull = pool.size >= MAX_ENTRIES;

	if (isFull && !existingEntry) {
		// Pool is full — can't keep this sandbox warm. Delete it.
		await backend.close().catch(console.error);
		return;
	}

	try {
		await backend.stop();
		pool.set(projectId, {
			sandboxId: backend.id,
			provider: "daytona",
			orgId: existingEntry?.orgId ?? "default-org",
			projectId,
			createdAt: existingEntry?.createdAt ?? Date.now(),
			lastUsedAt: Date.now(),
			inUse: false,
		});
	} catch (err) {
		// If stop fails, evict the entry and don't leave a zombie
		pool.delete(projectId);
		console.error(`[sandbox-pool] Failed to stop sandbox ${backend.id}:`, err);
	}
}

/**
 * Pre-warms a Daytona sandbox for a project so the next agent run starts
 * faster. Call this from an Inngest scheduled job during off-peak hours.
 */
export async function prewarmPool(
	orgId: string,
	projectId: string,
	tier: ComplexityTier = "complex",
): Promise<void> {
	if (pool.has(projectId)) return;

	const backend = await DaytonaSandboxBackend.create(
		tier,
		{},
		{ orgId, projectId, sessionId: "pool-warm" },
	);

	// Update lifecycle label to "warm" after creation
	// (Daytona doesn't support label mutation — use the id for pool tracking)
	await backend.stop();

	pool.set(projectId, {
		sandboxId: backend.id,
		provider: "daytona",
		orgId,
		projectId,
		createdAt: Date.now(),
		lastUsedAt: Date.now(),
		inUse: false,
	});
}

/**
 * Removes all pool entries and deletes their sandboxes.
 * Call during server shutdown or for testing teardown.
 */
export async function drainPool(): Promise<void> {
	const entries = [...pool.values()];
	pool.clear();

	await Promise.allSettled(
		entries.map((e) =>
			DaytonaSandboxBackend.reconnect(e.sandboxId)
				.then((b) => b.close())
				.catch(() => {
					/* already gone */
				}),
		),
	);
}

/**
 * Returns a snapshot of the current pool state for diagnostics / admin UI.
 */
export function getPoolStatus(): PoolEntry[] {
	evictExpired();
	return [...pool.values()];
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal
// ─────────────────────────────────────────────────────────────────────────────

function evictExpired(): void {
	const now = Date.now();
	for (const [projectId, entry] of pool) {
		if (!entry.inUse && now - entry.lastUsedAt > POOL_TTL_MS) {
			pool.delete(projectId);
			// Fire-and-forget close — the sandbox will be auto-archived by Daytona
			// if we don't explicitly delete it.
			DaytonaSandboxBackend.reconnect(entry.sandboxId)
				.then((b) => b.close())
				.catch(() => {
					/* ignore */
				});
		}
	}
}
