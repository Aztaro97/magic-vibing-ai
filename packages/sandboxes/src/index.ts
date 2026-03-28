// ── Main resolution entrypoints ──────────────────────────────────────────────
export { resolveSandbox } from "./router";
export {
  resolveProjectSandbox,
  pauseProjectSandbox,
  destroyProjectSandbox,
  releaseSandbox,
} from "./lifecycle/manager";

// ── Classifier — useful for testing routing decisions in isolation ───────────
export { classifyTask, daytonaResources, pickProvider } from "./classifier";

// ── Providers ────────────────────────────────────────────────────────────────
export { DaytonaSandboxBackend } from "./providers/daytona";
export { E2BSandboxBackend } from "./providers/e2b";

// ── Pool management ──────────────────────────────────────────────────────────
export {
  acquireFromPool,
  drainPool,
  getPoolStatus,
  prewarmPool,
  returnToPool,
} from "./pool";

// ── Constants ────────────────────────────────────────────────────────────────
export { CONTAINER_TIMEOUTS, getTimeoutForUserTier } from "./constants/timeouts";
export { buildSandboxEnvVars } from "./constants/sandbox-env";

// ── Utilities ────────────────────────────────────────────────────────────────
export { getExpoSubdomain } from "./utils/subdomain";
export { isSandboxNotFoundError } from "./utils/error-detection";
export { syncFilesToSandbox } from "./utils/file-sync";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  ComplexityScore,
  ComplexityTier,
  LifecycleOptions,
  LifecycleResult,
  PoolEntry,
  ResolvedSandbox,
  SandboxProvider,
  SandboxRouterOptions,
  SandboxStatus,
  TaskHints,
  UserTier,
} from "./types";
