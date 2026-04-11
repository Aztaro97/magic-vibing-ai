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
	 * Holds the live ngrok random preview URL once the tunnel is up.
	 * Only populated for E2B sandboxes in auto-provision mode.
	 * Consumers (e.g. AgentPanel) should read project.ngrokUrl from the DB
	 * via tRPC; this field is a dev-server convenience reference.
	 */
	public ngrokUrl: string | null = null;

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
					// Also starts ngrok and stores the random preview URL.
					sandbox = await LazySandbox._autoProvision(this);
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
	 * After provisioning an E2B sandbox, starts ngrok on port 8081 and polls
	 * localhost:4040/api/tunnels to capture the random preview URL
	 * (e.g. https://abc123.ngrok-free.app). Stores URL in `owner.ngrokUrl`.
	 *
	 * NOTE: This path is only used by the LangGraph dev server graph
	 * (`export const graph` in index.ts). Production API calls inject the
	 * sandbox via factory from `resolveProjectSandbox()` instead.
	 * orgId is intentionally omitted — dev-server mode bypasses concurrency limits.
	 */
	private static async _autoProvision(owner: LazySandbox): Promise<BaseSandbox> {
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

		// Start ngrok on E2B sandboxes and capture the random preview URL.
		// This mirrors the lifecycle manager's startNgrokAndGetUrl() behaviour
		// so the dev server path gets the same URL surfacing as the production path.
		if (resolved.provider === "e2b") {
			try {
				const env = await import("../../env").then((m) => m.env);
				if (env.NGROK_AUTHTOKEN) {
					const url = await LazySandbox._startNgrokAndGetUrl(
						resolved.instance as unknown as SandboxInstance,
					);
					if (url) {
						owner.ngrokUrl = url;
						console.info(`[LazySandbox] ngrok URL ready: ${url}`);
					}
				}
			} catch (err) {
				// ngrok failure is non-fatal — sandbox still works without tunnel
				console.warn("[LazySandbox] ngrok setup failed (non-fatal):", err);
			}
		}

		return resolved.instance;
	}

	/**
	 * Starts ngrok on port 8081 inside the sandbox and polls the local API
	 * until the random preview URL is available.
	 * Returns the URL or null if tunnel startup times out.
	 */
	private static async _startNgrokAndGetUrl(
		sandbox: SandboxInstance,
	): Promise<string | null> {
		// Kill any stale ngrok process and start a fresh tunnel on port 8081.
		// --log=stdout keeps it in foreground but we background via `&`.
		await sandbox.execute(
			"pkill -f 'ngrok http' 2>/dev/null || true; " +
			"ngrok http 8081 --log=stdout > /tmp/ngrok.log 2>&1 &",
		);

		// Give ngrok 3 seconds to bind before polling.
		await new Promise<void>((r) => setTimeout(r, 3_000));

		// Poll localhost:4040/api/tunnels every 2 s for up to 30 s.
		const MAX_ATTEMPTS = 15;
		const INTERVAL_MS = 2_000;

		for (let i = 0; i < MAX_ATTEMPTS; i++) {
			const result = await sandbox.execute(
				"curl -s http://localhost:4040/api/tunnels 2>/dev/null",
			);

			if (result.exitCode === 0 && result.output) {
				try {
					const data = JSON.parse(result.output) as {
						tunnels?: Array<{ public_url: string; proto: string }>;
					};
					const httpsTunnel = data.tunnels?.find((t) => t.proto === "https");
					if (httpsTunnel?.public_url) {
						return httpsTunnel.public_url;
					}
				} catch {
					// JSON not ready yet — keep polling
				}
			}

			await new Promise<void>((r) => setTimeout(r, INTERVAL_MS));
		}

		console.warn("[LazySandbox] ngrok tunnel did not start within 30s");
		return null;
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
