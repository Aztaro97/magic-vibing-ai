export interface SandboxLabels {
  /** Always "magic-vibing-ai" — used to scope all management ops to this app */
  app: "magic-vibing-ai";
  /** Which organisation owns this sandbox */
  orgId: string;
  /** Which project within the org */
  projectId: string;
  /** The agent session that spawned this sandbox */
  sessionId: string;
  /** Complexity tier — used for cost analytics */
  tier: "simple" | "moderate" | "complex" | "heavy";
  /** "warm" = pooled, "active" = in use, "ephemeral" = close after run */
  lifecycle: "warm" | "active" | "ephemeral";
}

/**
 * Build the full label set for a new sandbox.
 * Always use this — never construct labels inline.
 */
export function buildLabels(params: Omit<SandboxLabels, "app">): SandboxLabels {
  return { app: "magic-vibing-ai", ...params };
}

/**
 * Build a partial label set for querying.
 * Any subset of SandboxLabels can be used as a filter with deleteAll() / list().
 */
export function queryLabels(
  partial: Partial<Omit<SandboxLabels, "app">>,
): Partial<SandboxLabels> {
  return { app: "magic-vibing-ai", ...partial };
}
