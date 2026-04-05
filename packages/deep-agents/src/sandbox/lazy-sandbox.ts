import type {
	ExecuteResponse,
	FileDownloadResponse,
	FileUploadResponse,
} from "deepagents";
import { BaseSandbox } from "deepagents";
import { CommandExitError } from "e2b";

// ─────────────────────────────────────────────────────────────────────────────
// LazySandbox
//
// Provider-agnostic lazy sandbox wrapper. Defers sandbox provisioning until the
// first tool call (execute/uploadFiles/downloadFiles), bridging the
// sync-graph-compilation ↔ async-sandbox-creation gap.
//
// Two modes:
//   1. Factory injection: caller provides a `() => Promise<BaseSandbox>` factory
//      (used by the API router which resolves the sandbox via lifecycle manager)
//   2. Auto-provision: dynamically imports @acme/sandboxes and uses
//      `resolveSandbox()` to auto-select E2B or Daytona based on available keys
//      and task complexity (used by the LangGraph dev server graph)
// ─────────────────────────────────────────────────────────────────────────────

/** Duck-typed interface for the inner sandbox (avoids type mismatch across packages). */
interface SandboxInstance {
	readonly id: string;
	execute(command: string): Promise<ExecuteResponse>;
	uploadFiles(
		files: Array<[string, Uint8Array]>,
	): Promise<FileUploadResponse[]>;
	downloadFiles(paths: string[]): Promise<FileDownloadResponse[]>;
	close?(): Promise<void>;
}

export class LazySandbox extends BaseSandbox {
	private _inner: SandboxInstance | null = null;
	private _initPromise: Promise<SandboxInstance> | null = null;
	private _factory: (() => Promise<BaseSandbox>) | undefined;

	/**
	 * @param factory  Optional async factory that returns a ready `BaseSandbox`.
	 *                 When omitted, auto-provisions via `@acme/sandboxes` router.
	 */
	constructor(factory?: () => Promise<BaseSandbox>) {
		super();
		this._factory = factory;
	}

	/** Lazily provisions the sandbox on first use. Thread-safe via promise dedup. */
	private async _ensureInitialized(): Promise<SandboxInstance> {
		if (this._inner) return this._inner;

		if (!this._initPromise) {
			this._initPromise = (async () => {
				let sandbox: BaseSandbox;

				if (this._factory) {
					// Caller-provided factory (API router path)
					sandbox = await this._factory();
				} else {
					// Auto-provision via sandboxes router (dev server path)
					sandbox = await LazySandbox._autoProvision();
				}

				this._inner = sandbox as unknown as SandboxInstance;
				return this._inner;
			})().catch((err: unknown) => {
				// Reset so next call can retry
				this._initPromise = null;
				throw err;
			});
		}

		return this._initPromise;
	}

	/**
	 * Auto-provisions a sandbox using the @acme/sandboxes router.
	 * Dynamically imports to avoid hard compile-time dependency.
	 * Selects E2B or Daytona based on available API keys and classification.
	 *
	 * NOTE: This path is only used by the LangGraph dev server graph
	 * (`export const graph` in index.ts). Production API calls inject the
	 * sandbox via factory from `resolveProjectSandbox()` instead.
	 * orgId is intentionally omitted — dev-server mode bypasses concurrency limits.
	 */
	private static async _autoProvision(): Promise<BaseSandbox> {
		const { resolveSandbox } = await import("@acme/sandboxes");

		const resolved = await resolveSandbox({
			projectId: "dev-server",
			sessionId: `dev-${Date.now()}`,
			// orgId intentionally omitted: dev-server mode bypasses concurrency limits
			hints: {
				description: "LangGraph dev server sandbox",
			},
		});

		if (!resolved) {
			throw new Error(
				"[LazySandbox] No sandbox provider available. " +
				"Set E2B_API_KEY or DAYTONA_API_KEY to enable sandbox execution.",
			);
		}

		return resolved.instance;
	}

	get id(): string {
		return this._inner?.id ?? "lazy-sandbox-pending";
	}

	/**
	 * Execute a shell command inside the sandbox.
	 *
	 * `ExecuteResponse` from deepagents has the shape:
	 *   { output: string; exitCode: number; truncated: boolean }
	 *
	 * The inner E2BSandboxBackend throws CommandExitError on non-zero exit codes
	 * before we can inspect the result. We catch it here and return a valid
	 * ExecuteResponse so the LLM sees the error output (stdout + stderr) and can
	 * self-correct on the next step rather than crashing the entire run.
	 *
	 * Only real infrastructure errors (TimeoutError, AuthenticationError, etc.)
	 * are re-thrown — those are unrecoverable and should surface to the caller.
	 */
	async execute(command: string): Promise<ExecuteResponse> {
		const sandbox = await this._ensureInitialized();
		try {
			return await sandbox.execute(command);
		} catch (err) {
			// CommandExitError means the command ran but exited with a non-zero code.
			// This is recoverable — return it as a normal ExecuteResponse so the LLM
			// can see the output (e.g. tsc errors, ls: no such file) and self-correct.
			if (err instanceof CommandExitError) {
				return {
					output: err.output ?? `Command exited with code ${err.exitCode}`,
					exitCode: err.exitCode,
					truncated: false,
				};
			}
			// Re-throw real infrastructure errors (TimeoutError, AuthenticationError, etc.)
			throw err;
		}
	}

	async uploadFiles(
		files: Array<[string, Uint8Array]>,
	): Promise<FileUploadResponse[]> {
		const sandbox = await this._ensureInitialized();
		return sandbox.uploadFiles(files);
	}

	async downloadFiles(
		paths: string[],
	): Promise<FileDownloadResponse[]> {
		const sandbox = await this._ensureInitialized();
		return sandbox.downloadFiles(paths);
	}

	async close(): Promise<void> {
		if (this._inner) {
			await this._inner.close?.();
			this._inner = null;
			this._initPromise = null;
		}
	}
}
