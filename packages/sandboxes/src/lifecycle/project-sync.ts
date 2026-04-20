// ─��─────────────────────────────────────────────────��─────────────────────────
// Project sandbox state adapter
// Thin DB layer for reading/writing sandbox state on the `project` table.
// ──────────���──────────────────────────────────────────────────────────────────

import { db, eq, project, sql } from "@acme/db";

import type { SandboxProvider, SandboxStatus } from "../types";

export interface ProjectSandboxState {
	sandboxId: string | null;
	sandboxStatus: SandboxStatus | null;
	sandboxProvider: SandboxProvider | null;
	subdomain: string | null;
	ngrokUrl: string | null;
}

export interface ProjectWithSandboxState extends ProjectSandboxState {
	name: string;
}

/**
 * Loads the sandbox-related fields from a project row.
 * Throws if the project does not exist.
 */
export async function getProjectSandboxState(
	projectId: string,
): Promise<ProjectWithSandboxState> {
	const [proj] = await db
		.select({
			name: project.name,
			sandboxId: project.sandboxId,
			sandboxStatus: project.sandboxStatus,
			sandboxProvider: project.sandboxProvider,
			subdomain: project.subdomain,
			ngrokUrl: project.ngrokUrl,
		})
		.from(project)
		.where(eq(project.id, projectId))
		.limit(1);

	if (!proj) {
		throw new Error(`Project not found: ${projectId}`);
	}

	// The DB columns are untyped text — cast to our union types
	return {
		...proj,
		sandboxStatus: proj.sandboxStatus as SandboxStatus | null,
		sandboxProvider: proj.sandboxProvider as SandboxProvider | null,
	};
}

/**
 * Updates sandbox-related fields on a project row.
 * Automatically bumps `updatedAt`.
 */
export async function updateProjectSandboxState(
	projectId: string,
	state: Partial<ProjectSandboxState>,
): Promise<void> {
	await db
		.update(project)
		.set({ ...state, updatedAt: new Date() })
		.where(eq(project.id, projectId));
}

/**
 * Runs `fn` inside a transaction that holds a per-project advisory lock, so
 * two concurrent agent runs for the same project can't both create sandboxes
 * and orphan each other's state.
 *
 * Uses `pg_advisory_xact_lock(hashtext(projectId))` which is released when
 * the transaction commits or rolls back.
 */
export async function withProjectSandboxLock<T>(
	projectId: string,
	fn: () => Promise<T>,
): Promise<T> {
	return db.transaction(async (tx) => {
		await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${projectId}))`);
		return fn();
	});
}
