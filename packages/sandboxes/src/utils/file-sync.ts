// ─────────────────────────────────────────────────────────────────────────────
// Provider-agnostic file sync
// Writes a map of { path → content } into any BaseSandbox implementation.
// ─────────────────────────────────────────────────────────────────────────────

import type { BaseSandbox } from "deepagents";

/**
 * Synchronizes files into a sandbox, writing all entries in parallel.
 *
 * Accepts a `Record<string, string>` where keys are relative file paths
 * and values are UTF-8 file contents. Leading slashes are stripped for safety.
 *
 * Uses `BaseSandbox.uploadFiles()` so it works with both E2B and Daytona.
 */
export async function syncFilesToSandbox(
	sandbox: BaseSandbox,
	files: Record<string, string>,
): Promise<void> {
	const entries = Object.entries(files);
	if (entries.length === 0) return;

	const uploads: Array<[string, Uint8Array]> = entries.map(([path, content]) => {
		const safePath = String(path || "").replace(/^\/+/, "");
		if (!safePath) {
			throw new Error(`Invalid file path: "${path}"`);
		}
		return [safePath, new TextEncoder().encode(content)];
	});

	await sandbox.uploadFiles(uploads);
}
