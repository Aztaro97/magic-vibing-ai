// ─────────────────────────────────────────────────────────────────────────────
// Sandbox error detection utilities
// Ported from @acme/e2b — heuristic detection for "not found" sandbox errors.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines whether an error indicates a sandbox no longer exists.
 *
 * Works across both E2B and Daytona error formats by checking:
 * - Error message keywords ("not found", "does not exist", etc.)
 * - HTTP-style status/code fields (404, "NOT_FOUND")
 */
export function isSandboxNotFoundError(error: unknown): boolean {
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
