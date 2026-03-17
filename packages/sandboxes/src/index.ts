// ── Main resolution entrypoint ───────────────────────────────────────────────
export { resolveSandbox } from "./router";

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

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  ComplexityScore,
  ComplexityTier,
  PoolEntry,
  ResolvedSandbox,
  SandboxProvider,
  SandboxRouterOptions,
  TaskHints,
} from "./types";
