// ─��─────────────────────────────────────────────────��─────────────────────────
// Project sandbox state adapter
// Thin DB layer for reading/writing sandbox state on the `project` table.
// ──────────���──────────────────────────────────────────────────────────────────

import { db, eq, project } from "@acme/db";

import type { SandboxStatus } from "../types";

export interface ProjectSandboxState {
	sandboxId: string | null;
	sandboxStatus: SandboxStatus | null;
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
			subdomain: project.subdomain,
			ngrokUrl: project.ngrokUrl,
		})
		.from(project)
		.where(eq(project.id, projectId))
		.limit(1);

	if (!proj) {
		throw new Error(`Project not found: ${projectId}`);
	}

	// The DB column is untyped text — cast to our union type
	return {
		...proj,
		sandboxStatus: proj.sandboxStatus as SandboxStatus | null,
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
