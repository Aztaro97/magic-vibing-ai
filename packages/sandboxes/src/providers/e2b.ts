// packages/sandboxes/src/providers/e2b.ts

import { BaseSandbox, type ExecuteResponse } from "deepagents";
import { Sandbox } from "e2b";
import { env } from "../../env";
import type { TaskHints } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// E2B sandbox templates
// Map task types to pre-built E2B template IDs so sandboxes start faster.
// Templates must be built + published via `pnpm template:build:*`.
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATES = {
	nextjs: "nextjs-sandbox",   // Node 20, pnpm, TypeScript, Next.js deps
	expo: "expo-sandbox",     // Node 20, pnpm, Expo, React Native deps
	default: "base",             // E2B base image with Node 20
} as const;

type TemplateKey = keyof typeof TEMPLATES;

function pickTemplate(hints: TaskHints): string {
	const desc = hints.description?.toLowerCase() ?? "";
	if (desc.includes("expo") || desc.includes("react native") || desc.includes("mobile")) {
		return TEMPLATES.expo;
	}
	if (desc.includes("next") || desc.includes("admin") || desc.includes("dashboard")) {
		return TEMPLATES.nextjs;
	}
	return TEMPLATES.default;
}

// ─────────────────────────────────────────────────────────────────────────────
// E2BSandboxBackend
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps E2B's `Sandbox` as a DeepAgents `BaseSandbox`.
 *
 * E2B is the primary (fast-start) sandbox for simple and moderate tasks.
 * Sandboxes spin up in ~150ms and are automatically cleaned up when `close()`
 * is called or when the sandbox timeout expires.
 */
export class E2BSandboxBackend extends BaseSandbox {
	private _sandbox: Sandbox;
	private _id: string;

	private constructor(sandbox: Sandbox) {
		super();
		this._sandbox = sandbox;
		this._id = sandbox.sandboxId;
	}

	get id(): string {
		return this._id;
	}

	/**
	 * Creates a new E2B sandbox and returns an `E2BSandboxBackend` instance.
	 *
	 * @param hints   Task hints used to select the appropriate E2B template.
	 * @param timeout Max sandbox lifetime in seconds (default: 300 = 5 min).
	 */
	static async create(
		hints: TaskHints = {},
		timeout = 300
	): Promise<E2BSandboxBackend> {
		const apiKey = env.E2B_API_KEY;
		if (!apiKey) throw new Error("E2B_API_KEY is not set");

		const templateId = pickTemplate(hints);

		const sandbox = await Sandbox.create(templateId, {
			apiKey,
			timeoutMs: timeout * 1_000,
			envs: hints.envVars,
		});

		return new E2BSandboxBackend(sandbox);
	}

	// ── BaseSandbox required method ──────────────────────────────────────────

	async execute(command: string): Promise<ExecuteResponse> {
		const result = await this._sandbox.commands.run(command, {
			timeoutMs: (env.SANDBOX_TIMEOUT_SECONDS ?? 300) * 1_000,
		});

		return {
			output: result.stdout + (result.stderr ? `\nSTDERR:\n${result.stderr}` : ""),
			exitCode: result.exitCode,
			truncated: false,
		};
	}

	// ── File operations — delegated to BaseSandbox via execute() ────────────
	// BaseSandbox provides default implementations of uploadFiles/downloadFiles
	// using POSIX shell commands via execute(). No overrides needed unless
	// you want to use E2B's native file API for performance.

	async uploadFiles(files: Array<[string, Uint8Array]>): Promise<Array<{ path: string; error: string | null }>> {
		const results: Array<{ path: string; error: string | null }> = [];
		for (const [path, content] of files) {
			try {
				await this._sandbox.files.write(path, content);
				results.push({ path, error: null });
			} catch (err) {
				results.push({ path, error: String(err) });
			}
		}
		return results;
	}

	async downloadFiles(paths: string[]): Promise<Array<{ path: string; content: Uint8Array | null; error: string | null }>> {
		const results: Array<{ path: string; content: Uint8Array | null; error: string | null }> = [];
		for (const path of paths) {
			try {
				const content = await this._sandbox.files.readBytes(path);
				results.push({ path, content, error: null });
			} catch (err) {
				results.push({ path, content: null, error: String(err) });
			}
		}
		return results;
	}

	/** Permanently deletes the sandbox. */
	async close(): Promise<void> {
		await this._sandbox.kill();
	}

	/** Extend the sandbox timeout without closing it. */
	async keepAlive(additionalSeconds: number): Promise<void> {
		await this._sandbox.setTimeout(additionalSeconds * 1_000);
	}
}