import type {
	BackendRuntime,
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
//   2. Auto-provision: stores BackendRuntime and calls resolveSandbox() lazily,
//      extracting projectId/sessionId/description from runtime.configurable
//      (used by the LangGraph dev server graph)
// ─────────────────────────────────────────────────────────────────────────────

/** Duck-typed interface for the inner sandbox (avoids type mismatch across packages). */
interface SandboxInstance {
	readonly id: string;
	execute(command: string): Promise<ExecuteResponse>;
	/** Starts a daemon command without waiting for it to exit. See E2BSandboxBackend. */
	startBackground?(command: string): Promise<void>;
	uploadFiles(
		files: Array<[string, Uint8Array]>,
	): Promise<FileUploadResponse[]>;
	downloadFiles(paths: string[]): Promise<FileDownloadResponse[]>;
	close?(): Promise<void>;
}

type LazySandboxOptions =
	| { factory: () => Promise<BaseSandbox> }
	| { runtime?: BackendRuntime };

export class LazySandbox extends BaseSandbox {
	private _inner: SandboxInstance | null = null;
	private _initPromise: Promise<SandboxInstance> | null = null;
	private readonly _factory: (() => Promise<BaseSandbox>) | undefined;
	private readonly _runtime: BackendRuntime | undefined;

	/**
	 * Holds the live ngrok random preview URL once the tunnel is up.
	 * Only populated for E2B sandboxes in auto-provision mode.
	 * Consumers (e.g. AgentPanel) should read project.ngrokUrl from the DB
	 * via tRPC; this field is a dev-server convenience reference.
	 */
	public ngrokUrl: string | null = null;

	/**
	 * @param options  Either:
	 *   - `{ factory }` — async factory returning a ready `BaseSandbox`
	 *                     (API router path: factory resolves via lifecycle manager)
	 *   - `{ runtime }` — BackendRuntime whose configurable carries projectId/sessionId
	 *                     (LangGraph dev server path: auto-provisions via `@acme/sandboxes`)
	 */
	constructor(options: LazySandboxOptions) {
		super();
		if ("factory" in options) {
			this._factory = options.factory;
		} else {
			this._runtime = options.runtime;
		}
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
					// Passes `this` so _autoProvision can write back ngrokUrl.
					sandbox = await LazySandbox._autoProvision(this._runtime, this);
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
	 * Extracts projectId, sessionId, and description from runtime.configurable
	 * so the real project row is updated (never uses fake identifiers).
	 *
	 * After provisioning an E2B sandbox, starts ngrok on port 8081 and polls
	 * localhost:4040/api/tunnels to capture the random preview URL.
	 * Stores the URL in `owner.ngrokUrl`.
	 *
	 * NOTE: This path is only used by the LangGraph dev server graph
	 * (`export const graph` in index.ts). Production API calls inject the
	 * sandbox via factory from `resolveProjectSandbox()` instead.
	 * orgId is intentionally omitted — dev-server mode bypasses concurrency limits.
	 */
	private static async _autoProvision(
		runtime: BackendRuntime | undefined,
		owner: LazySandbox,
	): Promise<BaseSandbox> {
		const { resolveSandbox } = await import("@acme/sandboxes");

		const configurable = runtime?.configurable as Record<string, string> | undefined;
		const projectId = configurable?.projectId;
		const sessionId = configurable?.sessionId ?? configurable?.thread_id;
		const description = configurable?.description;

		if (!projectId || !sessionId) {
			throw new Error(
				"[LazySandbox] Cannot auto-provision: runtime.configurable must include " +
				"`projectId` and `sessionId` (or `thread_id`). " +
				"Pass these via the LangGraph invocation config.",
			);
		}

		const resolved = await resolveSandbox({
			projectId,
			sessionId,
			// orgId intentionally omitted: dev-server mode bypasses concurrency limits
			hints: { description },
		});

		if (!resolved) {
			throw new Error(
				"[LazySandbox] No sandbox provider available. " +
				"Set E2B_API_KEY or DAYTONA_API_KEY to enable sandbox execution.",
			);
		}

		// Start ngrok on E2B sandboxes and capture the random preview URL.
		// Writes back to `owner.ngrokUrl` — `_autoProvision` receives the instance
		// so it can update the non-static field.
		if (resolved.provider === "e2b") {
			const env = await import("../../env").then((m) => m.env);
			if (env.NGROK_AUTHTOKEN) {
				const url = await LazySandbox._startNgrokAndGetUrl(
					resolved.instance as unknown as SandboxInstance,
					env.NGROK_AUTHTOKEN,
				);
				if (url) {
					owner.ngrokUrl = url;
					console.info(`[LazySandbox] ngrok URL ready: ${url}`);
				}
			}
		}

		return resolved.instance;
	}

	/**
	 * Ensures Expo web is running on port 8081 (waits up to 60 s), configures
	 * the ngrok auth token, starts the daemon, and polls until the public URL
	 * is live. Uses a random ngrok URL (dev-server path has no fixed domain).
	 *
	 * Delegates to the shared `setupNgrok` helper from `@acme/sandboxes`.
	 */
	private static async _startNgrokAndGetUrl(
		sandbox: SandboxInstance,
		authtoken: string,
	): Promise<string | null> {
		const sandboxId = sandbox.id ?? "unknown";
		const tag = `[ngrok:dev-${sandboxId.slice(0, 8)}]`;

		const { setupNgrok } = await import("@acme/sandboxes");

		return setupNgrok(sandbox, { authtoken, tag });
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
					output: err.message ?? `Command exited with code ${err.exitCode}`,
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
