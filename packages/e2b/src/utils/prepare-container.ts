import { db, desc, eq, fragment, message, project } from "@acme/db";
import type { SandboxInstance } from "../config";
import { createExpoSandbox, getExpoSubdomain } from "../config";
import { getTimeoutForUserTier } from "./index";

interface EnsureOptions {
	timeoutMs?: number;
	extraEnv?: Record<string, string>;
}

export interface PreparedSandbox {
	sandboxId: string;
	url: string;
	subdomain: string;
}

function isSandboxNotFoundError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const err = error as { message?: string; code?: unknown; status?: unknown };
	const msg = (err.message ?? "").toLowerCase();
	const code = err.code ?? err.status;
	return (
		msg.includes("not found") ||
		msg.includes("does not exist") ||
		msg.includes("sandbox not found") ||
		msg.includes("container not found") ||
		code === 404 ||
		code === "NOT_FOUND"
	);
}

export async function prepareContainerForProject(
	projectId: string,
	options?: EnsureOptions,
) {

	// Get dynamic timeout based on user tier (allow override)
	const TIMEOUT_MS = options?.timeoutMs ?? getTimeoutForUserTier("FREE");

	// Load project to access its sandboxId
	const [proj] = await db
		.select()
		.from(project)
		.where(eq(project.id, projectId))
		.limit(1);

	const projectName = proj?.name ?? String(projectId);



	let container: SandboxInstance | null = null;

	if (proj?.sandboxId) {
		try {
			container = await createExpoSandbox("resume", { timeoutMs: TIMEOUT_MS, extraEnv: options?.extraEnv });
		} catch (error) {
			if (isSandboxNotFoundError(error)) {
				await db
					.update(project)
					.set({ sandboxId: null })
					.where(eq(project.id, projectId));
				container = await createNewContainer({ projectId, projectName }, TIMEOUT_MS);
				if (container.sandboxId) {
					await db
						.update(project)
						.set({ sandboxId: container.sandboxId })
						.where(eq(project.id, projectId));
				}
			} else {
				container = await handleContainerRecovery(projectId, TIMEOUT_MS);
			}
		}
	} else {
		container = await createNewContainer({ projectId, projectName }, TIMEOUT_MS, options?.extraEnv);
		if (container.sandboxId) {
			await db
				.update(project)
				.set({ sandboxId: container.sandboxId })
				.where(eq(project.id, projectId));
		}
	}

	// Get the latest fragment for this project by joining messages → fragments
	const [latestFragment] = await db
		.select({
			files: fragment.files,
			title: fragment.title,
			sandboxUrl: fragment.sandboxUrl,
		})
		.from(message)
		.innerJoin(fragment, eq(fragment.messageId, message.id))
		.where(eq(message.projectId, projectId))
		.orderBy(desc(fragment.createdAt))
		.limit(1);

	const files = (latestFragment?.files ?? {}) as Record<string, string>;
	await syncFilesToContainer(container, files);
	return container;
}




/**
 * Create new container
 */
async function createNewContainer(
	projectInfo: { projectId: string, projectName: string },
	timeoutMs: number,
	extraEnv?: Record<string, string>
): Promise<SandboxInstance> {

	const { projectId, projectName } = projectInfo;

	const subdomain = getExpoSubdomain(projectName);

	// Update project with subdomain
	await db.update(project).set({ subdomain }).where(eq(project.id, projectId));

	// Successfully acquired lock, create new sandbox
	return await createExpoSandbox("create", { projectName: projectId, timeoutMs, extraEnv })
}




/**
 * Handle container recovery failure cases
 */
async function handleContainerRecovery(
	projectId: string,
	timeoutMs: number,
	extraEnv?: Record<string, string>
): Promise<SandboxInstance> {
	// Successfully acquired lock, create new sandbox
	return await createExpoSandbox("create", { projectName: projectId, timeoutMs, extraEnv })
}



/**
 * Synchronize files to the sandbox container
 * Aligns with @agents createOrUpdateFile tool: writes relative paths directly into the sandbox
 */
export async function syncFilesToContainer(
	container: SandboxInstance | null,
	files: Record<string, string>,
): Promise<void> {
	if (!container) return;
	if (Object.keys(files).length === 0) return;

	const writeOps = Object.entries(files).map(async ([relativePath, content]) => {
		const safePath = String(relativePath || "").replace(/^\/+/, "");
		if (!safePath) {
			throw new Error("Invalid file path");
		}
		await container.files.write(safePath, content);
	});

	await Promise.all(writeOps);
}
