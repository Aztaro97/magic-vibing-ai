

import { BaseSandbox, type ExecuteResponse, type FileOperationError } from "deepagents";
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
	expo: "expo-web-app",     // Node 20, pnpm, Expo, React Native deps
	mobile: "mobile-template", // Node 20, pnpm, Expo, React Native deps
} as const;

type TemplateKey = keyof typeof TEMPLATES;

function pickTemplate(hints: TaskHints): string {
	const desc = hints.description?.toLowerCase() ?? "";
	if (desc.includes("expo") || desc.includes("react native") || desc.includes("mobile")) {
		return TEMPLATES.mobile;
	}
	if (desc.includes("next") || desc.includes("admin") || desc.includes("dashboard")) {
		return TEMPLATES.mobile;
	}
	return TEMPLATES.mobile;
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
	 * @param envVars Additional env vars to inject (merged with hints.envVars).
	 */
	static async create(
		hints: TaskHints = {},
		timeout = 300,
		envVars?: Record<string, string>,
	): Promise<E2BSandboxBackend> {
		const apiKey = env.E2B_API_KEY;
		if (!apiKey) throw new Error("E2B_API_KEY is not set");

		const templateId = pickTemplate(hints);

		const mergedEnvs = { ...envVars, ...hints.envVars };

		const sandbox = await Sandbox.create(templateId, {
			apiKey,
			timeoutMs: timeout * 1_000,
			envs: Object.keys(mergedEnvs).length > 0 ? mergedEnvs : undefined,
		});

		return new E2BSandboxBackend(sandbox);
	}

	/**
	 * Connects to an existing (running or paused) E2B sandbox by ID.
	 *
	 * Used for reconnecting after HITL pauses or resuming project-level
	 * sandboxes. Requires the sandbox to still be alive (not timed out).
	 *
	 * @param sandboxId The E2B sandbox ID to reconnect to.
	 * @param opts      Optional timeout and env vars.
	 */
	static async connect(
		sandboxId: string,
		opts?: { timeoutMs?: number },
	): Promise<E2BSandboxBackend> {
		const apiKey = env.E2B_API_KEY;
		if (!apiKey) throw new Error("E2B_API_KEY is not set");

		const sandbox = await Sandbox.connect(sandboxId, { apiKey });

		if (opts?.timeoutMs) {
			await sandbox.setTimeout(opts.timeoutMs);
		}

		return new E2BSandboxBackend(sandbox);
	}

	// ── BaseSandbox required method ──────────────────────────────────────────

	async execute(command: string): Promise<ExecuteResponse> {
		const result = await this._sandbox.commands.run(command, {
			timeoutMs: parseInt(env.SANDBOX_TIMEOUT_SECONDS ?? "300") * 1_000,
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

	async uploadFiles(files: Array<[string, Uint8Array]>): Promise<Array<{ path: string; error: FileOperationError | null }>> {
		const results: Array<{ path: string; error: FileOperationError | null }> = [];
		for (const [path, content] of files) {
			try {
				await this._sandbox.files.write(path, content);
				results.push({ path, error: null });
			} catch {
				results.push({ path, error: "permission_denied" });
			}
		}
		return results;
	}

	async downloadFiles(paths: string[]): Promise<Array<{ path: string; content: Uint8Array | null; error: FileOperationError | null }>> {
		const results: Array<{ path: string; content: Uint8Array | null; error: FileOperationError | null }> = [];
		for (const path of paths) {
			try {
				const content = await this._sandbox.files.read(path, { format: "bytes" });
				results.push({ path, content, error: null });
			} catch {
				results.push({ path, content: null, error: "file_not_found" });
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