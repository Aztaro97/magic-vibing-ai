import { DaytonaSandbox } from "@langchain/daytona";

export class TenantViolationError extends Error {
	constructor(sandboxId: string, orgId: string) {
		super(
			`Sandbox ${sandboxId} does not belong to org ${orgId}. ` +
			"Access denied.",
		);
		this.name = "TenantViolationError";
	}
}

/**
 * Verifies a sandbox belongs to the given org and project before reconnecting.
 * Throws TenantViolationError if labels don't match — never returns a sandbox
 * that belongs to a different tenant.
 *
 * Call this in resolveSandbox() before DaytonaSandboxBackend.reconnect().
 */
export async function assertSandboxOwnership(
	sandboxId: string,
	orgId: string,
	projectId: string,
): Promise<void> {
	// Use the raw Daytona SDK to read the sandbox metadata
	const sandbox = await (DaytonaSandbox as any).connect(sandboxId);
	const sdk = sandbox.sandbox;

	// getWorkDir exposes the sandbox metadata including labels
	const meta = await sdk.getWorkDir();

	// Labels are accessible via the underlying Daytona SDK
	// In @daytonaio/sdk the sandbox metadata includes labels
	const rawLabels =
		(sandbox as unknown as { labels?: Record<string, string> }).labels ?? {};

	const expectedApp = "magic-vibing-ai";
	const expectedOrg = orgId;
	const expectedProject = projectId;

	if (
		rawLabels["app"] !== expectedApp ||
		rawLabels["orgId"] !== expectedOrg ||
		rawLabels["projectId"] !== expectedProject
	) {
		// Close the connection immediately — don't return a handle to wrong-tenant sandbox
		await sandbox.close().catch(() => {
			/* ignore */
		});
		throw new TenantViolationError(sandboxId, orgId);
	}
}
