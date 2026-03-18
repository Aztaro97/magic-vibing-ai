/**
 * Container timeout configurations for different user tiers and use cases
 */
export const CONTAINER_TIMEOUTS = {
  /** FREE user container timeout (10 minutes) */
  FREE: 10 * 60_000,
  /** Professional user container timeout (20 minutes) */
  PAID: 20 * 60_000,
  /** Container pause timeout (5 minutes) */
  PAUSE: 5 * 60_000,
  /** API default timeout for container operations (5 minutes) */
  API_DEFAULT: 5 * 60_000,
} as const;
