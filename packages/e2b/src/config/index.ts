import { Sandbox } from "@e2b/code-interpreter";
import { env } from "../../env";

function sanitizeSubdomain(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 45) || "expo-web-app";
}

export async function createExpoSandbox(options?: { projectName?: string; extraEnv?: Record<string, string>; }) {
	const subdomain = sanitizeSubdomain(options?.projectName ?? "expo-web-app");
	const envVars = {
		EXPO_TUNNEL_SUBDOMAIN: subdomain,
		PORT: "8081",
		EXPO_WEB_PORT: "8081",
		EXPO_NO_INTERACTIVE: "1",
		...options?.extraEnv,
	};

	const sandbox = await Sandbox.create("expo-web-app", {
		apiKey: env.E2B_API_KEY,
		envs: envVars,
	});
	return sandbox;
}

// Backward-compatible singleton for places still importing `sbx`
export const sbx = await createExpoSandbox();
