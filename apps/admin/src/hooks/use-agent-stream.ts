
// Connects the frontend to the LangGraph agent server using @langchain/react's
// useStream hook with the custom auth JWT pattern from:
// https://docs.langchain.com/langsmith/custom-auth
//
// Flow:
//   1. mint()  → POST /api/agent/token  → returns a 5-min JWT
//   2. useStream connects to LANGGRAPH_SERVER_URL with Authorization: Bearer <jwt>
//   3. LangGraph server's auth.ts validates the JWT and populates langgraph_auth_user
//   4. stream.submit() sends user messages; stream.interrupt surfaces HITL pauses
//   5. stream.joinStream(runId) reconnects after tab navigation or network loss

"use client";

import type { createMagicVibingAgent } from "@acme/deep-agents/supervisor";
import { useStream } from "@langchain/react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// The LangGraph server runs separately from Next.js.
// In development: `npx @langchain/langgraph-cli dev --port 2024`
// In production:  deployed to LangSmith or self-hosted LangGraph Platform
const LANGGRAPH_SERVER_URL =
	process.env.NEXT_PUBLIC_LANGGRAPH_SERVER_URL ?? "http://localhost:2024";

const AGENT_ASSISTANT_ID = "agent"; // matches the graph key in langgraph.json

const TOKEN_REFRESH_BUFFER_MS = 30_000; // refresh JWT 30s before expiry

// sessionStorage key for persisting run ID across navigations
const RUN_ID_KEY = (sessionId: string) => `agent-run-id:${sessionId}`;

// ─────────────────────────────────────────────────────────────────────────────
// JWT management
// ─────────────────────────────────────────────────────────────────────────────

interface TokenResponse {
	token: string;
	expiresIn: number; // seconds
	threadId: string;
}

async function mintToken(projectId: string, sessionId: string): Promise<TokenResponse> {
	const res = await fetch("/api/agent/token", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ projectId, sessionId }),
		credentials: "same-origin", // sends Better Auth session cookie
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(
			err.error ?? `Token mint failed with status ${res.status}`
		);
	}

	return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseAgentStreamOptions {
	projectId: string;
	sessionId: string;
	onFragment?: (fragment: {
		sandboxUrl: string;
		files: Record<string, string>;
		title: string;
	}) => void;
}

export function useAgentStream({
	projectId,
	sessionId,
	onFragment,
}: UseAgentStreamOptions) {
	// ── Token state ────────────────────────────────────────────────────────────
	const [token, setToken] = useState<string | null>(null);
	const [tokenErr, setTokenErr] = useState<string | null>(null);
	const tokenExpiresAtRef = useRef<number>(0);
	const savedRunIdRef = useRef<string | null>(null);

	// ── Mint token on mount, then auto-refresh before expiry ──────────────────
	useEffect(() => {
		let refreshTimer: ReturnType<typeof setTimeout>;

		async function refresh() {
			try {
				const resp = await mintToken(projectId, sessionId);
				setToken(resp.token);
				setTokenErr(null);
				tokenExpiresAtRef.current = Date.now() + resp.expiresIn * 1_000;

				// Schedule next refresh
				const nextIn = resp.expiresIn * 1_000 - TOKEN_REFRESH_BUFFER_MS;
				refreshTimer = setTimeout(refresh, Math.max(nextIn, 10_000));
			} catch (err) {
				setTokenErr(err instanceof Error ? err.message : "Token error");
			}
		}

		void refresh();
		return () => clearTimeout(refreshTimer);
	}, [projectId, sessionId]);

	// ── useStream — only initialised once we have a valid token ───────────────
	const stream = useStream<typeof createMagicVibingAgent>({
		apiUrl: LANGGRAPH_SERVER_URL,
		assistantId: AGENT_ASSISTANT_ID,
		threadId: sessionId, // LangGraph thread = sessionId — one thread per agent session

		// Forward the JWT on every request to the LangGraph server.
		// The server's auth.ts validates this and populates langgraph_auth_user.
		headers: token ? { Authorization: `Bearer ${token}` } : {},

		// Don't start the hook until we have a token
		enabled: !!token,

		onCreated(run) {
			savedRunIdRef.current = run.run_id;
			if (typeof window !== "undefined") {
				sessionStorage.setItem(RUN_ID_KEY(sessionId), run.run_id);
			}
		},

		onFinish(messages) {
			if (!onFragment) return;
			const lastAi = [...messages].reverse().find((m) => m._getType() === "ai");
			if (!lastAi || typeof lastAi.content !== "string") return;
			try {
				const data = JSON.parse(lastAi.content);
				if (data?.sandboxUrl && data?.files) {
					onFragment({ sandboxUrl: data.sandboxUrl, files: data.files, title: data.title ?? "Fragment" });
				}
			} catch { /* streaming text — not JSON */ }
		},
	});

	// ── Auto-rejoin on mount if a run is in progress ──────────────────────────
	useEffect(() => {
		if (!token) return;
		const stored = sessionStorage.getItem(RUN_ID_KEY(sessionId));
		if (stored && !stream.isLoading) {
			savedRunIdRef.current = stored;
			stream.joinStream(stored).catch(() => {
				sessionStorage.removeItem(RUN_ID_KEY(sessionId));
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token]); // only run when token first becomes available

	// ── Page visibility: auto-rejoin on tab focus ─────────────────────────────
	useEffect(() => {
		function handleVisible() {
			if (document.visibilityState === "visible" && savedRunIdRef.current && !stream.isLoading && token) {
				stream.joinStream(savedRunIdRef.current).catch(() => {
					savedRunIdRef.current = null;
					sessionStorage.removeItem(RUN_ID_KEY(sessionId));
				});
			}
		}
		document.addEventListener("visibilitychange", handleVisible);
		return () => document.removeEventListener("visibilitychange", handleVisible);
	}, [stream, sessionId, token]);

	// ── Clean up run ID when stream finishes ──────────────────────────────────
	useEffect(() => {
		if (!stream.isLoading && !stream.interrupt) {
			sessionStorage.removeItem(RUN_ID_KEY(sessionId));
		}
	}, [stream.isLoading, stream.interrupt, sessionId]);

	// ── Public API ─────────────────────────────────────────────────────────────

	const send = useCallback(
		(content: string, model?: string) => {
			// Refresh token before sending if it's about to expire
			const msLeft = tokenExpiresAtRef.current - Date.now();
			if (msLeft < TOKEN_REFRESH_BUFFER_MS) {
				void mintToken(projectId, sessionId).then((resp) => {
					setToken(resp.token);
					tokenExpiresAtRef.current = Date.now() + resp.expiresIn * 1_000;
				});
			}

			stream.submit(
				{ messages: [{ type: "human", content }] },
				{
					onDisconnect: "continue",   // agent keeps running if user navigates away
					streamResumable: true,         // enables stream.joinStream(runId) later
					config: {
						configurable: {
							// projectId and sessionId are already embedded in the JWT —
							// the LangGraph auth handler extracts them from langgraph_auth_user.
							// We also pass them here as graph configurable for convenience.
							projectId,
							sessionId,
							model: model ?? process.env.NEXT_PUBLIC_DEFAULT_AGENT_MODEL ?? "claude-sonnet-4-6",
							thread_id: sessionId,
						},
					},
				}
			);
		},
		[stream, projectId, sessionId]
	);

	const approveHitl = useCallback(
		(decision: "approve" | "reject" | "edit", editedArgs?: unknown, reason?: string) => {
			stream.submit(null, {
				command: { resume: { decision, args: editedArgs, reason } },
			});
		},
		[stream]
	);

	const rejoin = useCallback(() => {
		if (savedRunIdRef.current) {
			stream.joinStream(savedRunIdRef.current);
		}
	}, [stream]);

	return {
		messages: stream.messages,
		isStreaming: stream.isLoading,
		toolCalls: stream.toolCalls,
		interrupt: stream.interrupt,
		error: tokenErr ?? stream.error ?? null,
		canRejoin: !stream.isLoading && !!savedRunIdRef.current,
		isReady: !!token,           // false while the first JWT is being minted
		send,
		approveHitl,
		rejoin,
		disconnect: stream.stop,
	};
}