// packages/jobs/src/sandbox-cleanup.ts

import { DaytonaSandbox } from "@langchain/daytona";
import { and, eq, lt } from "drizzle-orm";

import { db } from "@acme/db";
import { agentSession } from "@acme/db/schema";
import { queryLabels } from "@acme/sandboxes/labels";

import { inngestClient } from "../client";

// ── Job 1: Clean up all sandboxes for a specific finished session ─────────────
export const cleanupSessionSandbox = inngestClient.createFunction(
  { id: "cleanup-session-sandbox", name: "Sandbox: clean up session" },
  { event: "agent/session.finished" },
  async ({ event }) => {
    const { orgId, projectId, sessionId } = event.data as {
      orgId: string;
      projectId: string;
      sessionId: string;
    };

    const labels = queryLabels({ orgId, projectId, sessionId });

    await DaytonaSandbox.deleteAll(labels);

    return { deleted: true, labels };
  },
);

// ── Job 2: Nightly sweep — delete sandboxes for sessions idle >24h ────────────
export const nightlySandboxSweep = inngestClient.createFunction(
  {
    id: "nightly-sandbox-sweep",
    name: "Sandbox: nightly sweep",
    concurrency: { limit: 1 }, // never run two sweeps at once
  },
  { cron: "0 2 * * *" }, // 2am UTC daily
  async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1_000);

    // Find all sessions that ended more than 24h ago
    const staleSessions = await db
      .select({
        id: agentSession.id,
        orgId: agentSession.userId,
        projectId: agentSession.projectId,
      })
      .from(agentSession)
      .where(
        and(
          lt(agentSession.updatedAt, cutoff),
          eq(agentSession.status, "done"),
        ),
      )
      .limit(500);

    let totalDeleted = 0;

    for (const session of staleSessions) {
      try {
        const labels = queryLabels({
          orgId: session.orgId,
          projectId: session.projectId,
          sessionId: session.id,
        });

        await DaytonaSandbox.deleteAll(labels);
        totalDeleted++;
      } catch (err) {
        // Log but don't fail the whole sweep for one bad session
        console.error(
          `[sandbox-sweep] Failed to delete session ${session.id}:`,
          err,
        );
      }
    }

    return { swept: staleSessions.length, deleted: totalDeleted };
  },
);

// ── Job 3: Emergency purge — delete ALL sandboxes for an org (admin action) ───
export const purgeOrgSandboxes = inngestClient.createFunction(
  { id: "purge-org-sandboxes", name: "Sandbox: purge org" },
  { event: "admin/org.sandbox-purge-requested" },
  async ({ event }) => {
    const { orgId } = event.data as { orgId: string };

    // This deletes warm pool entries AND active sandboxes for the entire org.
    // Only call this from an admin-authenticated tRPC procedure.
    const labels = queryLabels({ orgId });
    await DaytonaSandbox.deleteAll(labels);

    return { purged: true, orgId };
  },
);
