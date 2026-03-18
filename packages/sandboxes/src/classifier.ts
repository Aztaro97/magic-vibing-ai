import type {
  ComplexityScore,
  ComplexityTier,
  SandboxProvider,
  TaskHints,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Keyword tables
//
// Each keyword adds `weight` to the overall complexity score.
// "forced" keywords short-circuit scoring and route directly to a provider.
// ─────────────────────────────────────────────────────────────────────────────

interface ScoredKeyword {
  pattern: RegExp;
  weight: number;
  reason: string;
  /** When set, immediately forces this provider regardless of total score. */
  force?: SandboxProvider;
}

const DAYTONA_KEYWORDS: ScoredKeyword[] = [
  // Hard forces — always Daytona
  {
    pattern: /\bgit\s+(clone|push|pull|fetch|submodule)\b/i,
    weight: 100,
    reason: "git operation",
    force: "daytona",
  },
  {
    pattern: /\bdocker[\s-](compose|build|run|push|pull)\b/i,
    weight: 100,
    reason: "Docker operation",
    force: "daytona",
  },
  {
    pattern: /\bdocker-in-docker\b|\bdind\b/i,
    weight: 100,
    reason: "Docker-in-Docker",
    force: "daytona",
  },
  {
    pattern: /\bgpu\b|\bcuda\b|\brocm\b/i,
    weight: 100,
    reason: "GPU requirement",
    force: "daytona",
  },
  {
    pattern: /\bnpm publish\b|\bpnpm publish\b|\byarn publish\b/i,
    weight: 100,
    reason: "publish to registry",
    force: "daytona",
  },
  {
    pattern: /\beas build\b|\beas submit\b/i,
    weight: 100,
    reason: "Expo EAS build",
    force: "daytona",
  },

  // Strong signals — high score, no hard force
  {
    pattern: /\bmonorepo\b|\bturborepo\b|\bnx build\b/i,
    weight: 40,
    reason: "full monorepo build",
  },
  {
    pattern: /\bci\b|\bcd\b|\bpipeline\b|\bworkflow\b/i,
    weight: 35,
    reason: "CI/CD pipeline",
  },
  {
    pattern: /\bdeploy(ment)?\b|\brelease\b/i,
    weight: 35,
    reason: "deployment task",
  },
  {
    pattern: /\bbuild\s+all\b|\bfull\s+build\b/i,
    weight: 35,
    reason: "full project build",
  },
  { pattern: /\bmigrat(e|ion)\b/i, weight: 30, reason: "database migration" },
  {
    pattern: /\bvitest\b.*\bcoverage\b|\bcoverage\b.*\bvitest\b/i,
    weight: 25,
    reason: "test coverage report",
  },
  {
    pattern: /\bplaywright\b|\bcypress\b|\be2e\b/i,
    weight: 25,
    reason: "E2E test suite",
  },

  // Moderate signals
  {
    pattern: /\binstall\s+deps\b|\bpnpm install\b|\bnpm install\b/i,
    weight: 20,
    reason: "dependency install",
  },
  { pattern: /\btypecheck\b|\btsc\b/i, weight: 15, reason: "full typecheck" },
  {
    pattern: /\blint\s+all\b|\brun\s+lint\b/i,
    weight: 15,
    reason: "full lint pass",
  },
  {
    pattern: /\bdrizzle[\s-]kit\b|\bdb:generate\b|\bdb:migrate\b/i,
    weight: 20,
    reason: "Drizzle migration",
  },
];

const E2B_KEYWORDS: ScoredKeyword[] = [
  {
    pattern: /\bquick\b|\bsnippet\b|\btry\b|\btest\s+this\b/i,
    weight: -20,
    reason: "quick/exploratory task",
  },
  {
    pattern: /\bsingle\s+file\b|\bone[\s-]liner\b/i,
    weight: -15,
    reason: "single-file task",
  },
  {
    pattern: /\bscript\b|\butility\b|\bhelper\b/i,
    weight: -10,
    reason: "small script/utility",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds
// ─────────────────────────────────────────────────────────────────────────────

const SCORE_THRESHOLDS: Record<ComplexityTier, number> = {
  simple: 0, // [0, 20)  → E2B
  moderate: 20, // [20, 45) → E2B (with slightly longer timeout)
  complex: 45, // [45, 70) → Daytona standard
  heavy: 70, // [70+]    → Daytona with boosted resources
};

// Provider selection by tier
const TIER_TO_PROVIDER: Record<ComplexityTier, SandboxProvider> = {
  simple: "e2b",
  moderate: "e2b",
  complex: "daytona",
  heavy: "daytona",
};

// ─────────────────────────────────────────────────────────────────────────────
// Classifier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scores a task based on the provided hints and returns a routing decision.
 *
 * Scoring strategy:
 * 1. Explicit `provider` override → immediately returns with that provider.
 * 2. Boolean flags (`requiresGit`, `requiresDocker`, etc.) → hard-force signals.
 * 3. Keyword scanning on `description` → adds weighted score for each match.
 * 4. Resource requirements → adds score based on CPU/RAM/disk needs.
 * 5. Duration estimate → tasks >5 min force Daytona.
 * 6. Total score → mapped to ComplexityTier → mapped to SandboxProvider.
 */
export function classifyTask(hints: TaskHints = {}): ComplexityScore {
  const reasons: string[] = [];
  let score = 0;
  let forcedProvider: SandboxProvider | undefined;

  // ── 1. Explicit provider override ────────────────────────────────────────
  if (hints.provider) {
    return {
      tier: hints.provider === "daytona" ? "complex" : "simple",
      score: hints.provider === "daytona" ? 50 : 10,
      reasons: [`explicit provider override: ${hints.provider}`],
      forcedProvider: hints.provider,
    };
  }

  // ── 2. Boolean flag hard-forces ──────────────────────────────────────────
  if (hints.requiresGit) {
    forcedProvider = "daytona";
    reasons.push("requiresGit flag set");
    score += 100;
  }
  if (hints.requiresDocker) {
    forcedProvider = "daytona";
    reasons.push("requiresDocker flag set");
    score += 100;
  }
  if (hints.requiresGpu) {
    forcedProvider = "daytona";
    reasons.push("requiresGpu flag set");
    score += 100;
  }
  if (hints.requiresCustomImage) {
    forcedProvider = "daytona";
    reasons.push("requiresCustomImage flag set");
    score += 80;
  }

  // ── 3. Resource requirements ─────────────────────────────────────────────
  if (hints.minCpu !== undefined && hints.minCpu > 1) {
    score += (hints.minCpu - 1) * 15;
    reasons.push(`minCpu=${hints.minCpu} (needs resource control)`);
    if (hints.minCpu >= 4) forcedProvider = "daytona";
  }
  if (hints.minMemoryGib !== undefined && hints.minMemoryGib > 2) {
    score += (hints.minMemoryGib - 2) * 10;
    reasons.push(`minMemory=${hints.minMemoryGib}GiB`);
    if (hints.minMemoryGib >= 8) forcedProvider = "daytona";
  }
  if (hints.minDiskGib !== undefined && hints.minDiskGib > 5) {
    score += (hints.minDiskGib - 5) * 5;
    reasons.push(`minDisk=${hints.minDiskGib}GiB`);
    if (hints.minDiskGib >= 20) forcedProvider = "daytona";
  }

  // ── 4. Duration estimate ─────────────────────────────────────────────────
  if (hints.estimatedDurationSeconds !== undefined) {
    const secs = hints.estimatedDurationSeconds;
    if (secs > 300) {
      forcedProvider = "daytona";
      score += 60;
      reasons.push(
        `estimatedDuration=${secs}s (>5 min requires persistent sandbox)`,
      );
    } else if (secs > 120) {
      score += 25;
      reasons.push(`estimatedDuration=${secs}s (moderate duration)`);
    } else if (secs > 60) {
      score += 10;
      reasons.push(`estimatedDuration=${secs}s`);
    }
  }

  // ── 5. Keyword scanning on description ───────────────────────────────────
  if (hints.description) {
    const desc = hints.description;

    for (const kw of DAYTONA_KEYWORDS) {
      if (kw.pattern.test(desc)) {
        score += kw.weight;
        reasons.push(kw.reason);
        if (kw.force) {
          forcedProvider = kw.force;
        }
      }
    }

    for (const kw of E2B_KEYWORDS) {
      if (kw.pattern.test(desc)) {
        score += kw.weight; // negative weights push score down
        reasons.push(kw.reason);
      }
    }
  }

  // ── 6. Clamp score to [0, 200] and derive tier ───────────────────────────
  score = Math.max(0, Math.min(200, score));

  let tier: ComplexityTier;
  if (score >= SCORE_THRESHOLDS.heavy) tier = "heavy";
  else if (score >= SCORE_THRESHOLDS.complex) tier = "complex";
  else if (score >= SCORE_THRESHOLDS.moderate) tier = "moderate";
  else tier = "simple";

  // Forced provider overrides tier-derived provider but not the tier label
  if (forcedProvider === "daytona" && tier === "simple") tier = "complex";
  if (forcedProvider === "daytona" && tier === "moderate") tier = "complex";

  if (reasons.length === 0) reasons.push("no complexity signals detected");

  return { tier, score, reasons, forcedProvider };
}

/**
 * Maps a completed ComplexityScore to the sandbox provider to use.
 */
export function pickProvider(score: ComplexityScore): SandboxProvider {
  if (score.forcedProvider) return score.forcedProvider;
  return TIER_TO_PROVIDER[score.tier];
}

/**
 * Maps a ComplexityTier to the Daytona resource profile to request.
 * Only applies when provider === "daytona".
 */
export function daytonaResources(
  tier: ComplexityTier,
  hints: TaskHints = {},
): { cpu: number; memory: number; disk: number } {
  // Explicit minimums always win
  const minCpu = hints.minCpu ?? 0;
  const minMem = hints.minMemoryGib ?? 0;
  const minDisk = hints.minDiskGib ?? 0;

  const profiles: Record<
    ComplexityTier,
    { cpu: number; memory: number; disk: number }
  > = {
    simple: { cpu: 1, memory: 1, disk: 5 },
    moderate: { cpu: 1, memory: 2, disk: 10 },
    complex: { cpu: 2, memory: 4, disk: 20 },
    heavy: { cpu: 4, memory: 8, disk: 50 },
  };

  const profile = profiles[tier];
  return {
    cpu: Math.max(profile.cpu, minCpu),
    memory: Math.max(profile.memory, minMem),
    disk: Math.max(profile.disk, minDisk),
  };
}
