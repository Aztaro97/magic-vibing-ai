// ─────────────────────────────────────────────────────────────────────────────
// Container timeout configuration
// Ported from @acme/e2b — centralized here for both E2B and Daytona providers.
// ─────────────────────────────────────────────────────────────────────────────

export const CONTAINER_TIMEOUTS = {
	/** Free tier: 1 hour — keeps preview URL alive after agent run */
	FREE: 60 * 60_000,
	/** Paid tier: 2 hours */
	PAID: 120 * 60_000,
	/** Pause keepAlive: 1 hour grace period so preview stays up */
	PAUSE: 60 * 60_000,
	/** Default API operation timeout: 5 minutes */
	API_DEFAULT: 5 * 60_000,
} as const;

import type { UserTier } from "../types";

/**
 * Returns the sandbox timeout in milliseconds based on the user's subscription tier.
 */
export function getTimeoutForUserTier(tier: UserTier): number {
	return tier === "PAID" ? CONTAINER_TIMEOUTS.PAID : CONTAINER_TIMEOUTS.FREE;
}
