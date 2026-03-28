// ─────────────────────────────────────────────────────────────────────────────
// Subdomain utilities
// Ported from @acme/e2b — generates DNS-safe subdomains for Expo tunneling.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SUBDOMAIN = "expo-web-app";
const MAX_LENGTH = 45;

/**
 * Sanitizes an arbitrary string into a valid DNS subdomain label.
 *
 * - Lowercases
 * - Strips non-alphanumeric/dash characters
 * - Trims leading/trailing dashes
 * - Caps at 45 characters
 * - Falls back to "expo-web-app" if empty
 */
function sanitizeSubdomain(input: string): string {
	return (
		input
			.toLowerCase()
			.replace(/[^a-z0-9-]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, MAX_LENGTH) || DEFAULT_SUBDOMAIN
	);
}

/**
 * Generates a DNS-safe subdomain from a project name.
 * Used for Expo tunnel configuration and ngrok URL computation.
 */
export function getExpoSubdomain(projectName?: string): string {
	return sanitizeSubdomain(projectName ?? DEFAULT_SUBDOMAIN);
}
