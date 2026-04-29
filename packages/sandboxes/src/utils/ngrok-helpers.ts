// ─────────────────────────────────────────────────────────────────────────────
// Shared ngrok + Expo port helpers
//
// Used by:
//   - lifecycle/manager.ts  (production path via resolveProjectSandbox)
//   - deep-agents/lazy-sandbox.ts (dev-server path)
//   - apps/admin/api/sandbox/ngrok/route.ts (on-demand restart)
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal duck-type interface every sandbox path satisfies. */
export interface NgrokSandboxLike {
	execute(command: string): Promise<{ output: string; exitCode: number | null }>;
	startBackground?(command: string): Promise<void>;
}

export interface NgrokSetupOptions {
	/** ngrok auth token (required). */
	authtoken: string;
	/**
	 * Custom/static domain to pin the tunnel to, e.g. `{projectId}.ngrok.dev`.
	 * When omitted ngrok allocates a random preview URL.
	 */
	domain?: string;
	/** Local port to tunnel (default: 8081). */
	port?: number;
	/** Log prefix for console output. */
	tag?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Port readiness
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Polls `http://localhost:{port}` inside the sandbox every `intervalMs`
 * until it returns a non-zero HTTP status, or until `maxWaitMs` elapses.
 *
 * Returns `true` when the port is ready, `false` on timeout.
 */
export async function waitForPortReady(
	sandbox: NgrokSandboxLike,
	{
		port = 8081,
		maxWaitMs = 60_000,
		intervalMs = 3_000,
		tag = "",
	}: { port?: number; maxWaitMs?: number; intervalMs?: number; tag?: string } = {},
): Promise<boolean> {
	const deadline = Date.now() + maxWaitMs;
	let attempt = 0;

	while (Date.now() < deadline) {
		attempt++;
		try {
			const result = await sandbox.execute(
				`curl -s -o /dev/null -w '%{http_code}' http://localhost:${port}/ 2>/dev/null || echo 0`,
			);
			const code = parseInt(result.output?.trim() ?? "0", 10);
			if (code > 0) {
				if (tag) console.log(`${tag} port ${port} ready (HTTP ${code}) after ${attempt} probe(s) ✔`);
				return true;
			}
		} catch {
			// Sandbox may still be initializing — ignore transient errors
		}
		if (tag) {
			console.log(`${tag} port ${port} not ready yet (probe ${attempt}), retrying in ${intervalMs}ms…`);
		}
		await sleep(intervalMs);
	}

	if (tag) console.warn(`${tag} ✖ port ${port} still not ready after ${Math.round(maxWaitMs / 1000)}s`);
	return false;
}

/**
 * Ensures the Expo web server is running on port 8081.
 *
 * If nothing is listening, issues `bun run web` in the background, then polls
 * for up to 60 s. Returns `true` once the port is confirmed ready.
 */
export async function ensureExpoRunning(
	sandbox: NgrokSandboxLike,
	tag: string,
): Promise<boolean> {
	// Fast path — already up
	try {
		const probe = await sandbox.execute(
			"curl -s -o /dev/null -w '%{http_code}' http://localhost:8081/ 2>/dev/null || echo 0",
		);
		const code = parseInt(probe.output?.trim() ?? "0", 10);
		if (code > 0) {
			console.log(`${tag} Expo already running on port 8081 (HTTP ${code}) ✔`);
			return true;
		}
	} catch { /* ignore */ }

	// Issue start command
	console.log(`${tag} Expo not detected on port 8081 — starting bun run web…`);
	const expoCmd =
		"cd /home/user/app && EXPO_NO_INTERACTIVE=1 EXPO_WEB_PORT=8081 PORT=8081" +
		" nohup bun run web >> /tmp/expo.log 2>&1";
	try {
		if (sandbox.startBackground) {
			await sandbox.startBackground(expoCmd);
		} else {
			await sandbox.execute(`${expoCmd} &`);
		}
		console.log(`${tag} Expo start command issued — waiting for port 8081 to be ready…`);
	} catch (err) {
		console.warn(`${tag} Expo start failed (non-fatal):`, err);
	}

	// Wait for port with retries (up to 60 s)
	return waitForPortReady(sandbox, { port: 8081, maxWaitMs: 60_000, intervalMs: 3_000, tag });
}

// ─────────────────────────────────────────────────────────────────────────────
// ngrok lifecycle helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Kills any running ngrok process inside the sandbox. */
export async function killStaleNgrok(sandbox: NgrokSandboxLike, tag: string): Promise<void> {
	try {
		if (sandbox.startBackground) {
			await sandbox.startBackground("pkill -9 ngrok 2>/dev/null; true");
		} else {
			await sandbox.execute("pkill -9 ngrok 2>/dev/null || true");
		}
		await sleep(1_500);
		console.log(`${tag} stale ngrok killed ✔`);
	} catch { /* No stale ngrok is fine */ }
}

/** Configures the ngrok auth token inside the sandbox. */
export async function configureNgrokAuth(
	sandbox: NgrokSandboxLike,
	authtoken: string,
	tag: string,
): Promise<void> {
	try {
		await sandbox.execute(`ngrok config add-authtoken ${authtoken} 2>/dev/null || true`);
		console.log(`${tag} ngrok authtoken configured ✔`);
	} catch (err) {
		console.warn(`${tag} ngrok authtoken config failed (non-fatal):`, err);
	}
}

/**
 * Starts ngrok as a background daemon.
 * Pass `domain` to pin to a custom/static URL; omit for a random preview URL.
 */
export async function startNgrokDaemon(
	sandbox: NgrokSandboxLike,
	{ domain, port = 8081, tag = "" }: { domain?: string; port?: number; tag?: string },
): Promise<void> {
	const domainFlag = domain ? ` --domain=${domain}` : "";
	const cmd = `ngrok http${domainFlag} ${port} --log=stdout > /tmp/ngrok.log 2>&1`;
	console.log(`${tag} launching ngrok daemon: ${cmd}`);
	try {
		if (sandbox.startBackground) {
			await sandbox.startBackground(cmd);
		} else {
			await sandbox.execute(`${cmd} &`);
		}
	} catch (err) {
		console.warn(`${tag} ngrok daemon start threw (non-fatal — may already be running):`, err);
	}
	// Give ngrok a moment to bind before polling
	await sleep(3_000);
}

/**
 * Polls the ngrok local API at localhost:4040/api/tunnels until a live HTTPS
 * tunnel appears. If `expectedUrl` is provided the tunnel must match exactly;
 * otherwise the first HTTPS tunnel is returned.
 *
 * Returns the public URL or `null` on timeout.
 */
export async function pollNgrokTunnel(
	sandbox: NgrokSandboxLike,
	{
		expectedUrl,
		maxAttempts = 15,
		intervalMs = 2_000,
		tag = "",
	}: {
		expectedUrl?: string;
		maxAttempts?: number;
		intervalMs?: number;
		tag?: string;
	} = {},
): Promise<string | null> {
	for (let i = 0; i < maxAttempts; i++) {
		console.log(`${tag} poll ${i + 1}/${maxAttempts}${expectedUrl ? ` for ${expectedUrl}` : ""}…`);
		try {
			const result = await sandbox.execute(
				"curl -s http://localhost:4040/api/tunnels 2>/dev/null",
			);
			if ((result.exitCode === 0 || result.exitCode === null) && result.output) {
				const data = JSON.parse(result.output) as {
					tunnels?: Array<{ public_url: string; proto: string }>;
				};
				const tunnels = data.tunnels ?? [];
				if (tunnels.length > 0) {
					console.log(`${tag} tunnels: ${tunnels.map((t) => t.public_url).join(", ")}`);
				}

				const match = expectedUrl
					? tunnels.find((t) => t.proto === "https" && t.public_url === expectedUrl)
					: tunnels.find((t) => t.proto === "https");

				if (match?.public_url) return match.public_url;
			}
		} catch { /* ignore */ }
		await sleep(intervalMs);
	}

	// Dump ngrok log to help diagnose failures
	try {
		const log = await sandbox.execute("tail -20 /tmp/ngrok.log 2>/dev/null || echo '(no log)'");
		console.warn(`${tag} ngrok log tail:\n${log.output}`);
	} catch { /* ignore */ }

	return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// High-level orchestrators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full ngrok setup for a single domain:
 * 1. Configure auth token
 * 2. Kill stale ngrok
 * 3. Ensure Expo is running on port 8081 (waits up to 60 s)
 * 4. Start ngrok daemon
 * 5. Poll for live tunnel URL
 *
 * Returns the public URL or `null` on failure.
 */
export async function setupNgrok(
	sandbox: NgrokSandboxLike,
	opts: NgrokSetupOptions,
): Promise<string | null> {
	const { authtoken, domain, port = 8081, tag = "[ngrok]" } = opts;

	console.log(`${tag} ── starting ngrok setup (domain=${domain ?? "random"})`);

	await configureNgrokAuth(sandbox, authtoken, tag);
	await killStaleNgrok(sandbox, tag);

	const expoReady = await ensureExpoRunning(sandbox, tag);
	if (!expoReady) {
		console.warn(
			`${tag} Expo did not become ready on port 8081 within 60s. ` +
			`Proceeding with ngrok anyway — tunnel may serve errors until Expo starts.`,
		);
	}

	await startNgrokDaemon(sandbox, { domain, port, tag });

	return pollNgrokTunnel(sandbox, {
		expectedUrl: domain ? `https://${domain}` : undefined,
		tag,
	});
}

/**
 * Tries the custom domain first. If it fails (domain not registered, authtoken
 * issue, etc.) automatically falls back to a random ngrok preview URL.
 *
 * This is the recommended entry point for production sandbox provisioning.
 */
export async function setupNgrokWithFallback(
	sandbox: NgrokSandboxLike,
	opts: NgrokSetupOptions & { domain: string },
): Promise<string | null> {
	const { tag = "[ngrok]", domain } = opts;

	const customUrl = await setupNgrok(sandbox, opts);
	if (customUrl) {
		console.info(`${tag} ✔ custom domain tunnel live → ${customUrl}`);
		return customUrl;
	}

	// Custom domain failed — fall back to random URL
	console.warn(
		`${tag} custom domain '${domain}' did not come up. Falling back to random ngrok URL.\n` +
		`  → Ensure the domain is reserved on your ngrok account\n` +
		`  → Or set NGROK_DOMAIN_MODE=random in your env to skip custom domains`,
	);

	const fallbackUrl = await setupNgrok(sandbox, { ...opts, domain: undefined });
	if (fallbackUrl) {
		console.info(`${tag} ✔ fallback random tunnel live → ${fallbackUrl}`);
		return fallbackUrl;
	}

	console.error(`${tag} ✖ both custom-domain and random-URL ngrok attempts failed`);
	return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}
