import { Sandbox } from '@e2b/code-interpreter'


export const sandboxTimeout = parseInt(
	process.env.E2B_SANDBOX_TIMEOUT_MS || '3600000',
)


export async function connectSandbox(
	sandboxId: string,
	opts?: { enforceMaxLifetime?: boolean },
): Promise<Sandbox | null> {
	const sandbox = await Sandbox.connect(sandboxId)
	await sandbox.setTimeout(sandboxTimeout)

	if (opts?.enforceMaxLifetime) {
		try {
			const info = await sandbox.getInfo()
			const startedAt = new Date(info.startedAt).getTime()
			const elapsed = Date.now() - startedAt

			if (elapsed >= sandboxTimeout) {
				console.log(
					`[sandbox-connect] Sandbox ${sandboxId} exceeded max lifetime (${Math.round(elapsed / 60000)}min > ${Math.round(sandboxTimeout / 60000)}min). Killing.`,
				)
				await sandbox.kill()
				return null
			}

			// Correct timeout to remaining time so it doesn't extend beyond original max
			const remaining = sandboxTimeout - elapsed
			await sandbox.setTimeout(remaining)
		} catch (error) {
			console.error(
				`[sandbox-connect] Error checking sandbox lifetime for ${sandboxId}:`,
				error,
			)
		}
	}

	return sandbox
}
