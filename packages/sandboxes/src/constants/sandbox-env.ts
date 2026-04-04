// ─────────────────────────────────────────────────────────────────────────────
// Sandbox environment variable builder
// Constructs provider-specific env vars for Expo/ngrok sandbox configuration.
// ─────────────────────────────────────────────────────────────────────────────

import type { SandboxProvider } from "../types";

export interface SandboxEnvOptions {
	/** DNS-safe subdomain for the Expo tunnel. */
	subdomain: string;
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
 * - **E2B**: Full Expo config (tunnel subdomain, ports, ngrok token)
 * - **Daytona**: Base vars + any caller-supplied extras
 *
 * Both providers receive `extraEnv` overrides.
 */
export function buildSandboxEnvVars(options: SandboxEnvOptions): Record<string, string> {
	const { subdomain, provider, extraEnv, ngrokAuthToken } = options;

	const base: Record<string, string> = {};

	if (provider === "e2b") {
		// Expo-specific configuration for E2B sandboxes
		// base.EXPO_TUNNEL_SUBDOMAIN = subdomain;
		base.PORT = "8081";
		base.EXPO_WEB_PORT = "8081";
		base.EXPO_NO_INTERACTIVE = "1";

		if (ngrokAuthToken) {
			base.NGROK_AUTHTOKEN = ngrokAuthToken;
		}
	}

	// Daytona injects its own base vars (LangSmith, log level) at creation
	// time in the provider — we only add caller-supplied extras here.

	return { ...base, ...extraEnv };
}
