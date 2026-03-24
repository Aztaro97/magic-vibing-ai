import type { ExecuteResponse, FileDownloadResponse, FileUploadResponse } from "deepagents";
import { BaseSandbox } from "deepagents";

// ─────────────────────────────────────────────────────────────────────────────
// LazyE2BSandbox
//
// The LangGraph dev server compiles the graph synchronously at module load,
// but E2B sandbox creation is async. This wrapper defers E2B provisioning
// until the first tool call (execute/uploadFiles/downloadFiles), bridging the
// sync-graph-compilation ↔ async-sandbox-creation gap.
//
// Uses dynamic import to avoid hard compile-time dependency on @acme/sandboxes.
// ─────────────────────────────────────────────────────────────────────────────

/** Duck-typed interface for the inner sandbox (avoids type mismatch with E2BSandboxBackend). */
interface SandboxInstance {
	readonly id: string;
	execute(command: string): Promise<ExecuteResponse>;
	uploadFiles(files: Array<[string, Uint8Array]>): Promise<FileUploadResponse[]>;
	downloadFiles(paths: string[]): Promise<FileDownloadResponse[]>;
	close?(): Promise<void>;
}

export class LazyE2BSandbox extends BaseSandbox {
	private _inner: SandboxInstance | null = null;
	private _initPromise: Promise<SandboxInstance> | null = null;
	private _timeout: number;

	constructor(timeout = 300) {
		super();
		this._timeout = timeout;
	}

	/** Lazily provisions the E2B sandbox on first use. Thread-safe via promise dedup. */
	private async _ensureInitialized(): Promise<SandboxInstance> {
		if (this._inner) return this._inner;

		if (!this._initPromise) {
			this._initPromise = (async () => {
				const { E2BSandboxBackend } = await import("@acme/sandboxes");
				const sandbox = await E2BSandboxBackend.create({}, this._timeout);
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

	get id(): string {
		return this._inner?.id ?? "lazy-e2b-pending";
	}

	async execute(command: string): Promise<ExecuteResponse> {
		const sandbox = await this._ensureInitialized();
		return sandbox.execute(command);
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
			// BaseSandbox doesn't define close(), but E2BSandboxBackend does.
			await this._inner.close?.();
			this._inner = null;
			this._initPromise = null;
		}
	}
}
