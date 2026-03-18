import type { BaseSandbox } from "deepagents";

// ─────────────────────────────────────────────────────────────────────────────
// Provider IDs
// ─────────────────────────────────────────────────────────────────────────────

export type SandboxProvider = "e2b" | "daytona";

// ─────────────────────────────────────────────────────────────────────────────
// Task complexity signals — fed to the classifier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hints the agent router or caller can provide about an upcoming task.
 * All fields are optional — any combination is valid.
 */
export interface TaskHints {
	/** Explicit provider override — skips all scoring and uses this directly. */
	provider?: SandboxProvider;

	/** Freeform description of the task. Used for keyword scoring. */
	description?: string;

	/** Expected wall-clock duration in seconds. >300 forces Daytona. */
	estimatedDurationSeconds?: number;

	/** Task requires cloning or pushing a git repo. Forces Daytona. */
	requiresGit?: boolean;

	/** Task requires running Docker or docker-compose. Forces Daytona. */
	requiresDocker?: boolean;

	/** Task requires GPU access. Forces Daytona. */
	requiresGpu?: boolean;

	/**
	 * Task needs a custom base image (e.g. pre-installed dependencies).
	 * Forces Daytona (E2B custom templates are pre-compiled; Daytona accepts
	 * any image string at creation time).
	 */
	requiresCustomImage?: boolean;
	customImage?: string;

	/**
	 * Additional environment variables to inject into the sandbox.
	 * Keys and values are strings; secrets are resolved from process.env.
	 */
	envVars?: Record<string, string>;

	/** Minimum CPU cores needed. >1 routes to Daytona for resource control. */
	minCpu?: number;

	/** Minimum RAM in GiB. >2 routes to Daytona. */
	minMemoryGib?: number;

	/** Minimum disk space in GiB. >10 routes to Daytona. */
	minDiskGib?: number;

	/**
	 * Re-use an existing sandbox that has already been provisioned.
	 * The router will reconnect instead of creating a new sandbox.
	 */
	existingSandboxId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Complexity score output
// ─────────────────────────────────────────────────────────────────────────────

export type ComplexityTier = "simple" | "moderate" | "complex" | "heavy";

export interface ComplexityScore {
	tier: ComplexityTier;
	score: number; // 0–100
	reasons: string[]; // human-readable explanation of each contributing factor
	forcedProvider?: SandboxProvider;
}

// ─────────────────────────────────────────────────────────────────────────────
// Router resolution result
// ─────────────────────────────────────────────────────────────────────────────

export interface ResolvedSandbox {
	/** The live sandbox instance, compatible with createDeepAgent `backend`. */
	instance: BaseSandbox;

	/** Which provider was actually used. */
	provider: SandboxProvider;

	/** The sandbox ID assigned by the provider. */
	id: string;

	/**
	 * Whether to close (delete) the sandbox after the agent run.
	 * `false` for reconnected or pooled sandboxes — they are managed externally.
	 */
	shouldClose: boolean;

	/** The complexity score that drove the routing decision. */
	complexity: ComplexityScore;

	/** Timestamp when the sandbox was acquired (ms epoch). */
	acquiredAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Router options
// ─────────────────────────────────────────────────────────────────────────────

export interface SandboxRouterOptions {
	orgId?: string;
	projectId: string;
	sessionId: string;

	/** Complexity hints from the caller. */
	hints?: TaskHints;

	/**
	 * If the session already has a sandbox provisioned (from a previous HITL
	 * resume or reconnect), pass its ID and provider here so the router can
	 * reconnect instead of creating a new one.
	 */
	existingId?: string;
	existingProvider?: SandboxProvider;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pool entry — used by the Daytona sandbox pool
// ─────────────────────────────────────────────────────────────────────────────

export interface PoolEntry {
	sandboxId: string;
	provider: "daytona";
	orgId: string;
	projectId: string;
	createdAt: number;
	lastUsedAt: number;
	inUse: boolean;
}
