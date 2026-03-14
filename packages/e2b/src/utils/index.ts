import { Sandbox } from "@e2b/code-interpreter";
import { CONTAINER_TIMEOUTS } from "../constants";

export async function getSandbox(sandboxId: string) {
	try {
		const sandbox = await Sandbox.connect(sandboxId);
		await sandbox.setTimeout(10 * 60_000); // 10 minutes
		return sandbox;
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error(`[e2b] Failed to connect to sandbox ${sandboxId}:`, msg);
		throw new Error(
			`Failed to connect to sandbox: ${msg}`
		);
	}
}

/**
 * Get timeout for user tier
 */
export function getTimeoutForUserTier(tier: 'FREE' | 'PAID'): number {
	switch (tier) {
		case 'FREE':
			return CONTAINER_TIMEOUTS.FREE
		default:
			return CONTAINER_TIMEOUTS.PAID
	}
}
