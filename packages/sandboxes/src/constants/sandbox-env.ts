// ─────────────────────────────────────────────────────────────────────────────
// Sandbox environment variable builder
// Constructs provider-specific env vars for Expo/ngrok sandbox configuration.
// ─────────────────────────────────────────────────────────────────────────────

import type { SandboxProvider } from "../types";

export interface SandboxEnvOptions {
	/** DNS-safe subdomain for the Expo tunnel. */
	subdomain: string;
	/** Project ID — used as the ngrok custom domain ({projectId}.ngrok.dev). */
	projectId: string;
	/** Which sandbox provider is being used. */
	provider: SandboxProvider;
	/** Additional env vars to merge (caller-supplied). */
	extraEnv?: Record<string, string>;
	/** Ngrok auth token — injected when available. */
	ngrokAuthToken?: string;
}

/**
 * Builds the environment variables to inject into a sandbox.
 *
 * - **E2B**: Full Expo config (ports, ngrok token + custom domain)
 * - **Daytona**: Base vars + any caller-supplied extras
 *
 * Both providers receive `extraEnv` overrides.
 *
 * The ngrok custom domain is derived from the projectId:
 *   https://{projectId}.ngrok.dev
 * This requires a paid ngrok account with the domain registered.
 */
export function buildSandboxEnvVars(options: SandboxEnvOptions): Record<string, string> {
	const { projectId, provider, extraEnv, ngrokAuthToken } = options;

	const base: Record<string, string> = {};

	if (provider === "e2b") {
		base.PORT = "8081";
		base.EXPO_WEB_PORT = "8081";
		base.EXPO_NO_INTERACTIVE = "1";

		if (ngrokAuthToken) {
			base.NGROK_AUTHTOKEN = ngrokAuthToken;
		}

		// Expose the deterministic custom domain to the sandbox so any
		// in-sandbox scripts can reference it without re-computing.
		base.NGROK_DOMAIN = `${projectId}.ngrok.dev`;
	}

	return { ...base, ...extraEnv };
}
