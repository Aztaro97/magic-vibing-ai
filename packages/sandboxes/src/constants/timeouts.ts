// ─────────────────────────────────────────────────────────────────────────────
// Container timeout configuration
// Ported from @acme/e2b — centralized here for both E2B and Daytona providers.
// ─────────────────────────────────────────────────────────────────────────────

export const CONTAINER_TIMEOUTS = {
	/** Free tier: 10 minutes */
	FREE: 10 * 60_000,
	/** Paid tier: 20 minutes */
	PAID: 20 * 60_000,
	/** Pause timeout: 5 minutes */
	PAUSE: 5 * 60_000,
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
