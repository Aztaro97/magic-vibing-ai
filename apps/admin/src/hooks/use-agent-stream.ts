"use client";

import { useStream } from "@langchain/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { createMagicVibingAgent } from "@acme/deep-agents/supervisor";

const LANGGRAPH_SERVER_URL =
	process.env.NEXT_PUBLIC_LANGGRAPH_SERVER_URL ?? "http://localhost:2024";

const TOKEN_REFRESH_BUFFER_MS = 30_000;
const RUN_KEY = (id: string) => `lg-run:${id}`;

interface TokenResponse {
	token: string;
	expiresIn: number;
	threadId: string;
}

async function mintToken(
	projectId: string,
	sessionId: string,
): Promise<TokenResponse> {
	const res = await fetch("/api/agent/token", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ projectId, sessionId }),
		credentials: "same-origin",
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error ?? `Token mint failed: ${res.status}`);
	}
	return res.json();
}

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
	const [token, setToken] = useState<string | null>(null);
	const [tokenErr, setTokenErr] = useState<string | null>(null);
	const tokenExpiresAtRef = useRef<number>(0);
	const savedRunIdRef = useRef<string | null>(null);

	// Memoized auth headers — only rebuilds when token changes.
	// useStreamLGP reads `defaultHeaders` (not `headers`) when creating the Client.
	const defaultHeaders = useMemo(
		() => (token ? { Authorization: `Bearer ${token}` } : undefined),
		[token],
	);

	// Mint JWT on mount, auto-refresh before expiry
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>;
		async function refresh() {
			try {
				const resp = await mintToken(projectId, sessionId);
				setToken(resp.token);
				setTokenErr(null);
				tokenExpiresAtRef.current = Date.now() + resp.expiresIn * 1_000;
				const nextIn = resp.expiresIn * 1_000 - TOKEN_REFRESH_BUFFER_MS;
				timer = setTimeout(refresh, Math.max(nextIn, 10_000));
			} catch (err) {
				setTokenErr(err instanceof Error ? err.message : "Token error");
			}
		}
		void refresh();
		return () => clearTimeout(timer);
	}, [projectId, sessionId]);

	const stream = useStream<typeof createMagicVibingAgent>({
		apiUrl: LANGGRAPH_SERVER_URL,
		assistantId: "deep-agents",

		// Gate threadId on token availability so that getState() is never called
		// before the thread exists. The token route AWAITS thread creation, so the
		// thread is guaranteed to exist by the time the token arrives.
		threadId: token ? projectId : undefined,

		// `defaultHeaders` is the correct prop — useStreamLGP ignores `headers`.
		defaultHeaders,

		onCreated(run) {
			savedRunIdRef.current = run.run_id;
			sessionStorage.setItem(RUN_KEY(projectId), run.run_id);
		},

		onFinish(messages) {
			// Fragment extraction: try LLM JSON output first (for agents that output
			// structured JSON), then fall back to the project.ngrokUrl DB poll in
			// AgentPanel — which is the reliable path for the LangGraph server.
			if (!onFragment) return;
			const lastAi = [...messages].reverse().find((m) => m._getType() === "ai");
			if (!lastAi || typeof lastAi.content !== "string") return;
			try {
				const data = JSON.parse(lastAi.content);
				// Only trigger the fragment callback if we have both required fields.
				// If sandboxUrl is missing, AgentPanel's ngrokUrl poll handles it instead.
				if (data?.sandboxUrl && data?.files) {
					onFragment({
						sandboxUrl: data.sandboxUrl,
						files: data.files,
						title: data.title ?? "Fragment",
					});
				}
			} catch {
				// Streamed prose — not JSON. The ngrokUrl poll in AgentPanel will
				// surface the preview URL as soon as it's written to the DB.
			}
		},
	});

	// Stable ref so callbacks below don't take `stream` as a dep (stream object
	// is a new reference on every render, which would make send/approveHitl/rejoin
	// unstable and cause the AgentPanel auto-send effect to re-run infinitely).
	const streamRef = useRef(stream);
	streamRef.current = stream;

	// Auto-rejoin on mount if a run was in progress
	useEffect(() => {
		if (!token) return;
		const stored = sessionStorage.getItem(RUN_KEY(projectId));
		if (stored && !streamRef.current.isLoading) {
			savedRunIdRef.current = stored;
			streamRef.current
				.joinStream(stored)
				.catch(() => sessionStorage.removeItem(RUN_KEY(projectId)));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token]);

	// Auto-rejoin on tab focus
	useEffect(() => {
		function onVisible() {
			if (
				document.visibilityState === "visible" &&
				savedRunIdRef.current &&
				!streamRef.current.isLoading &&
				token
			) {
				streamRef.current.joinStream(savedRunIdRef.current).catch(() => {
					savedRunIdRef.current = null;
					sessionStorage.removeItem(RUN_KEY(projectId));
				});
			}
		}
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}, [projectId, token]);

	// Clean up run key when done
	useEffect(() => {
		if (!stream.isLoading && !stream.interrupt) {
			sessionStorage.removeItem(RUN_KEY(projectId));
		}
	}, [stream.isLoading, stream.interrupt, projectId]);

	const send = useCallback(
		(content: string, model?: string) => {
			if (Date.now() > tokenExpiresAtRef.current - TOKEN_REFRESH_BUFFER_MS) {
				void mintToken(projectId, sessionId).then((resp) => {
					setToken(resp.token);
					tokenExpiresAtRef.current = Date.now() + resp.expiresIn * 1_000;
				});
			}
			streamRef.current.submit(
				{ messages: [{ type: "human", content }] },
				{
					onDisconnect: "continue",
					streamResumable: true,
					config: {
						configurable: {
							projectId,
							sessionId,
							thread_id: projectId, // always = projectId
							model:
								model ??
								process.env.NEXT_PUBLIC_DEFAULT_AGENT_MODEL ??
								"claude-sonnet-4-6",
						},
					},
					metadata: {
						projectId,
						sessionId,
						thread_id: projectId,
					},
				},
			);
		},
		[projectId, sessionId],
	);

	const approveHitl = useCallback(
		(
			decision: "approve" | "reject" | "edit",
			editedArgs?: unknown,
			reason?: string,
		) => {
			streamRef.current.submit(null, {
				command: { resume: { decision, args: editedArgs, reason } },
			});
		},
		[],
	);

	const rejoin = useCallback(() => {
		if (savedRunIdRef.current)
			void streamRef.current.joinStream(savedRunIdRef.current);
	}, []);

	return {
		messages: stream.messages,
		isStreaming: stream.isLoading,
		toolCalls: stream.toolCalls,
		interrupt: stream.interrupt,
		error: tokenErr ?? stream.error ?? null,
		canRejoin: !stream.isLoading && !!savedRunIdRef.current,
		isReady: !!token,
		send,
		approveHitl,
		rejoin,
		disconnect: stream.stop,
	};
}
