import type {
	ExecuteResponse,
	FileDownloadResponse,
	FileUploadResponse,
} from "deepagents";
import { BaseSandbox } from "deepagents";

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

	async execute(command: string): Promise<ExecuteResponse> {
		const sandbox = await this._ensureInitialized();
		return sandbox.execute(command);
	}

	// async execute(command: string): Promise<ExecuteResponse> {
	// 	const sandbox = await this._ensureInitialized();
	// 	const result = await sandbox.execute(command);
	// 	// Surface stderr back to the model instead of letting the SDK throw
	// 	if (result.exitCode !== 0) {
	// 		return {
	// 			...result,
	// 			// deepagents SDK uses this field to decide whether to throw CommandExitError
	// 			stdout: result.stdout,
	// 			stderr: result.stderr ?? `Command exited with code ${result.exitCode}`,
	// 		};
	// 	}
	// 	return result;
	// }

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
