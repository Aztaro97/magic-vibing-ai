import { describe, expect, it } from "vitest";

import { classifyTask, pickProvider } from "../classifier.js";

// ─────────────────────────────────────────────────────────────────────────────
// Explicit overrides
// ─────────────────────────────────────────────────────────────────────────────

describe("explicit provider override", () => {
  it("bypasses all scoring when provider=e2b", () => {
    const score = classifyTask({
      provider: "e2b",
      description: "git clone the entire monorepo and run docker-compose",
    });
    expect(score.forcedProvider).toBe("e2b");
    expect(pickProvider(score)).toBe("e2b");
  });

  it("bypasses all scoring when provider=daytona", () => {
    const score = classifyTask({
      provider: "daytona",
      description: "quick one-liner script",
    });
    expect(score.forcedProvider).toBe("daytona");
    expect(pickProvider(score)).toBe("daytona");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Boolean flag forces
// ─────────────────────────────────────────────────────────────────────────────

describe("boolean flag hard-forces", () => {
  it("requiresGit → daytona", () => {
    const score = classifyTask({ requiresGit: true });
    expect(pickProvider(score)).toBe("daytona");
    expect(score.reasons).toContain("requiresGit flag set");
  });

  it("requiresDocker → daytona", () => {
    const score = classifyTask({ requiresDocker: true });
    expect(pickProvider(score)).toBe("daytona");
  });

  it("requiresGpu → daytona", () => {
    const score = classifyTask({ requiresGpu: true });
    expect(pickProvider(score)).toBe("daytona");
  });

  it("requiresCustomImage → daytona", () => {
    const score = classifyTask({
      requiresCustomImage: true,
      customImage: "python:3.12",
    });
    expect(pickProvider(score)).toBe("daytona");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Resource requirements
// ─────────────────────────────────────────────────────────────────────────────

describe("resource requirements", () => {
  it("minCpu=1 stays e2b", () => {
    const score = classifyTask({ minCpu: 1 });
    expect(pickProvider(score)).toBe("e2b");
  });

  it("minCpu=4 forces daytona", () => {
    const score = classifyTask({ minCpu: 4 });
    expect(pickProvider(score)).toBe("daytona");
  });

  it("minMemoryGib=2 stays e2b", () => {
    const score = classifyTask({ minMemoryGib: 2 });
    expect(pickProvider(score)).toBe("e2b");
  });

  it("minMemoryGib=8 forces daytona", () => {
    const score = classifyTask({ minMemoryGib: 8 });
    expect(pickProvider(score)).toBe("daytona");
  });

  it("minDiskGib=5 stays e2b", () => {
    const score = classifyTask({ minDiskGib: 5 });
    expect(pickProvider(score)).toBe("e2b");
  });

  it("minDiskGib=20 forces daytona", () => {
    const score = classifyTask({ minDiskGib: 20 });
    expect(pickProvider(score)).toBe("daytona");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Duration estimates
// ─────────────────────────────────────────────────────────────────────────────

describe("duration estimates", () => {
  it("30s task stays e2b", () => {
    const score = classifyTask({ estimatedDurationSeconds: 30 });
    expect(pickProvider(score)).toBe("e2b");
  });

  it("150s task stays e2b (moderate)", () => {
    const score = classifyTask({ estimatedDurationSeconds: 150 });
    expect(pickProvider(score)).toBe("e2b");
    expect(score.tier).toBe("moderate");
  });

  it("600s task forces daytona", () => {
    const score = classifyTask({ estimatedDurationSeconds: 600 });
    expect(pickProvider(score)).toBe("daytona");
    expect(score.reasons.some((r) => r.includes("estimatedDuration"))).toBe(
      true,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Keyword scoring — Daytona triggers
// ─────────────────────────────────────────────────────────────────────────────

describe("keyword scoring → daytona", () => {
  const daytona = (description: string) =>
    pickProvider(classifyTask({ description }));

  it("git clone → daytona", () =>
    expect(daytena("git clone https://github.com/org/repo")).toBe("daytona"));
  it("git push → daytona", () =>
    expect(daytena("git push origin main")).toBe("daytona"));
  it("docker compose → daytona", () =>
    expect(daytena("run docker-compose up")).toBe("daytona"));
  it("docker build → daytona", () =>
    expect(daytena("docker build -t myapp .")).toBe("daytona"));
  it("dind → daytona", () =>
    expect(daytena("uses Docker-in-Docker (dind)")).toBe("daytona"));
  it("gpu/cuda → daytona", () =>
    expect(daytena("train model with CUDA on GPU")).toBe("daytona"));
  it("npm publish → daytona", () =>
    expect(daytena("npm publish package to registry")).toBe("daytona"));
  it("eas build → daytona", () =>
    expect(daytena("eas build --platform ios")).toBe("daytona"));
  it("full monorepo build", () =>
    expect(daytona("run full monorepo build")).toBe("daytona"));
  it("deploy → daytona (complex)", () => {
    const score = classifyTask({
      description: "deploy the monorepo to production",
    });
    expect(pickProvider(score)).toBe("daytona");
  });
  it("playwright e2e → daytona", () => {
    const score = classifyTask({
      description: "run playwright e2e test suite",
    });
    expect(pickProvider(score)).toBe("daytona");
  });
  it("pnpm install → complex", () => {
    const score = classifyTask({
      description: "pnpm install all dependencies",
    });
    expect(score.tier === "moderate" || score.tier === "complex").toBe(true);
  });

  function daytena(d: string) {
    return daytona(d);
  } // alias to dodge lint
});

// ─────────────────────────────────────────────────────────────────────────────
// Keyword scoring — E2B stays
// ─────────────────────────────────────────────────────────────────────────────

describe("keyword scoring → e2b", () => {
  it("quick script → e2b", () => {
    const score = classifyTask({
      description: "write a quick utility function",
    });
    expect(pickProvider(score)).toBe("e2b");
    expect(score.tier).toBe("simple");
  });

  it("simple snippet → e2b", () => {
    const score = classifyTask({
      description: "test this single file snippet",
    });
    expect(pickProvider(score)).toBe("e2b");
  });

  it("empty description → e2b (default)", () => {
    const score = classifyTask({ description: "" });
    expect(pickProvider(score)).toBe("e2b");
  });

  it("no hints → e2b (default)", () => {
    expect(pickProvider(classifyTask())).toBe("e2b");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Combined signals
// ─────────────────────────────────────────────────────────────────────────────

describe("combined signals", () => {
  it("moderate duration + monorepo → daytona", () => {
    const score = classifyTask({
      description: "build the monorepo and run typecheck",
      estimatedDurationSeconds: 180,
    });
    expect(pickProvider(score)).toBe("daytona");
    expect(score.score).toBeGreaterThan(45);
  });

  it("git flag + quick description — flag wins over keyword e2b signals", () => {
    const score = classifyTask({
      requiresGit: true,
      description: "quick git push of the changes",
    });
    // "quick" would normally reduce score, but requiresGit is a hard force
    expect(pickProvider(score)).toBe("daytona");
  });

  it("e2b task + custom image → daytona (image wins)", () => {
    const score = classifyTask({
      requiresCustomImage: true,
      description: "quick test with python 3.12",
    });
    expect(pickProvider(score)).toBe("daytona");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tier transitions
// ─────────────────────────────────────────────────────────────────────────────

describe("tier transitions", () => {
  it("score 0 → simple", () => {
    expect(classifyTask().tier).toBe("simple");
  });

  it("score 20–44 → moderate", () => {
    // pnpm install adds ~20 points
    const score = classifyTask({ description: "pnpm install" });
    expect(["moderate", "complex"].includes(score.tier)).toBe(true);
  });

  it("score ≥70 → heavy", () => {
    // git clone + docker build + 10min duration = heavy
    const score = classifyTask({
      description: "git clone then docker build and run docker-compose up",
      estimatedDurationSeconds: 600,
    });
    expect(score.tier).toBe("heavy");
    expect(score.score).toBeGreaterThanOrEqual(70);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reasons surfaced
// ─────────────────────────────────────────────────────────────────────────────

describe("reason surfacing", () => {
  it("includes reason for each matched signal", () => {
    const score = classifyTask({
      requiresGit: true,
      estimatedDurationSeconds: 400,
      description: "run full monorepo build",
    });
    expect(score.reasons).toContain("requiresGit flag set");
    expect(score.reasons.some((r) => r.includes("estimatedDuration"))).toBe(
      true,
    );
    expect(score.reasons.some((r) => r.includes("monorepo"))).toBe(true);
  });

  it("provides a fallback reason when nothing matches", () => {
    const score = classifyTask({});
    expect(score.reasons.length).toBeGreaterThan(0);
  });
});
