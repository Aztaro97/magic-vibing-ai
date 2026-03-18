// packages/sandboxes/src/concurrency.ts

import { env } from "../env";
import { queryLabels } from "./labels";

const MAX_ACTIVE_PER_ORG = parseInt(env.SANDBOX_MAX_CONCURRENT_PER_USER ?? "5");

/**
 * Counts how many active (non-warm, non-stopped) sandboxes the org currently has.
 * Throws if the limit is reached so the router can return a 429-equivalent error.
 */
export async function assertConcurrencyLimit(orgId: string): Promise<void> {
	if (MAX_ACTIVE_PER_ORG === 0) return; // 0 = unlimited

	// List all active sandboxes for this org using label filtering
	const labels = queryLabels({ orgId, lifecycle: "active" });

	// The Daytona SDK supports label-based listing via the management API.
	// Until @langchain/daytona exposes a list() method, use deleteAll's dry-run
	// equivalent or maintain a count in Redis/DB. For now, track in-process:
	const activeCount = getInProcessActiveCount(orgId);

	if (activeCount >= MAX_ACTIVE_PER_ORG) {
		throw new Error(
			`Org ${orgId} has reached the maximum of ${MAX_ACTIVE_PER_ORG} ` +
			"concurrent sandboxes. Wait for an existing session to complete.",
		);
	}
}

// In-process counter — replace with Redis INCR/DECR for multi-replica deployments
const activeCounts = new Map<string, number>();

export function incrementActiveCount(orgId: string): void {
	activeCounts.set(orgId, (activeCounts.get(orgId) ?? 0) + 1);
}

export function decrementActiveCount(orgId: string): void {
	const current = activeCounts.get(orgId) ?? 0;
	activeCounts.set(orgId, Math.max(0, current - 1));
}

function getInProcessActiveCount(orgId: string): number {
	return activeCounts.get(orgId) ?? 0;
}
