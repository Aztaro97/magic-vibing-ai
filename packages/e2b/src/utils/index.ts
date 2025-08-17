import { Sandbox } from "@e2b/code-interpreter";
import { CONTAINER_TIMEOUTS } from "../constants";

export async function getSandbox(sandboxId: string) {
	const sandbox = await Sandbox.connect(sandboxId);
	await sandbox.setTimeout(10 * 60_000); // 10 minutes
	return sandbox;
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