import { Sandbox } from "@e2b/code-interpreter";

import { env } from "../../env";

const TEMPLATE_NAME = "expo-web-app";

function sanitizeSubdomain(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 45) || "expo-web-app"
  );
}

export function getExpoSubdomain(projectName?: string): string {
  return sanitizeSubdomain(projectName ?? "expo-web-app");
}

export type SandboxInstance = Sandbox;

export async function createExpoSandbox(
  operation: "create" | "connect" | "resume",
  options?: {
    projectName?: string;
    extraEnv?: Record<string, string>;
    timeoutMs?: number;
  },
): Promise<SandboxInstance> {
  const subdomain = sanitizeSubdomain(options?.projectName ?? "expo-web-app");
  const envVars = {
    EXPO_TUNNEL_SUBDOMAIN: subdomain,
    PORT: "8081",
    EXPO_WEB_PORT: "8081",
    EXPO_NO_INTERACTIVE: "1",
    ...(env.NGROK_AUTHTOKEN ? { NGROK_AUTHTOKEN: env.NGROK_AUTHTOKEN } : {}),
    ...options?.extraEnv,
  };

  let sandbox: Sandbox;
  try {
    switch (operation) {
      case "create":
        sandbox = await Sandbox.create(TEMPLATE_NAME, {
          apiKey: env.E2B_API_KEY,
          envs: envVars,
          timeoutMs: options?.timeoutMs,
        });
        break;
      case "connect":
        sandbox = await Sandbox.connect(TEMPLATE_NAME, {
          apiKey: env.E2B_API_KEY,
        });
        break;
      case "resume":
        sandbox = await Sandbox.connect(TEMPLATE_NAME, {
          apiKey: env.E2B_API_KEY,
        });
        break;
      default:
        throw new Error(`Unknown sandbox operation: ${operation}`);
    }

    return sandbox;
  } catch (error) {
    console.error(`[e2b] Sandbox ${operation} failed:`, error);
    throw error;
  }
}

// Lazy singleton — initialized on first use, not at import time.
// This prevents top-level-await crashes (e.g. rate limit at startup).
let _sbx: Sandbox | null = null;

export async function getDefaultSandbox(): Promise<Sandbox> {
  if (!_sbx) {
    _sbx = await createExpoSandbox("create");
  }
  return _sbx;
}

/**
 * @deprecated Use `getDefaultSandbox()` instead.
 * Kept for backward compatibility — will throw if accessed before init.
 */
export const sbx = new Proxy({} as Sandbox, {
  get(_target, prop) {
    if (!_sbx) {
      throw new Error(
        "Sandbox not initialized. Use getDefaultSandbox() or pass a sandboxId directly.",
      );
    }
    return (_sbx as any)[prop];
  },
});
