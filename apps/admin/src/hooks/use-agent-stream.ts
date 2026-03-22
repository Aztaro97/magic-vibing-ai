"use client";

import type { createMagicVibingAgent } from "@acme/deep-agents/supervisor";
import { useStream } from "@langchain/react";
import { useCallback, useEffect, useRef, useState } from "react";

const LANGGRAPH_SERVER_URL =
	process.env.NEXT_PUBLIC_LANGGRAPH_SERVER_URL ?? "http://localhost:2024";

const TOKEN_REFRESH_BUFFER_MS = 30_000;
const RUN_KEY = (id: string) => `lg-run:${id}`;

interface TokenResponse { token: string; expiresIn: number; threadId: string; }

async function mintToken(projectId: string, sessionId: string): Promise<TokenResponse> {
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
	onFragment?: (fragment: { sandboxUrl: string; files: Record<string, string>; title: string }) => void;
}

export function useAgentStream({ projectId, sessionId, onFragment }: UseAgentStreamOptions) {
	const [token, setToken] = useState<string | null>(null);
	const [tokenErr, setTokenErr] = useState<string | null>(null);
	const tokenExpiresAtRef = useRef<number>(0);
	const savedRunIdRef = useRef<string | null>(null);

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

		// thread_id = projectId ALWAYS.
		// Thread was created by projects.create before this component ever mounts.
		// Token route is a safety net that also creates it (idempotent).
		// Therefore this GET /threads/{projectId}/state always returns 200.
		threadId: projectId,

		// Only enable after JWT is ready — prevents requests with no auth header
		enabled: !!token,

		headers: token ? { Authorization: `Bearer ${token}` } : {},

		onCreated(run) {
			savedRunIdRef.current = run.run_id;
			sessionStorage.setItem(RUN_KEY(projectId), run.run_id);
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
			} catch { /* streaming text */ }
		},
	});

	// Auto-rejoin on mount if a run was in progress
	useEffect(() => {
		if (!token) return;
		const stored = sessionStorage.getItem(RUN_KEY(projectId));
		if (stored && !stream.isLoading) {
			savedRunIdRef.current = stored;
			stream.joinStream(stored).catch(() => sessionStorage.removeItem(RUN_KEY(projectId)));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token]);

	// Auto-rejoin on tab focus
	useEffect(() => {
		function onVisible() {
			if (document.visibilityState === "visible" && savedRunIdRef.current && !stream.isLoading && token) {
				stream.joinStream(savedRunIdRef.current).catch(() => {
					savedRunIdRef.current = null;
					sessionStorage.removeItem(RUN_KEY(projectId));
				});
			}
		}
		document.addEventListener("visibilitychange", onVisible);
		return () => document.removeEventListener("visibilitychange", onVisible);
	}, [stream, projectId, token]);

	// Clean up run key when done
	useEffect(() => {
		if (!stream.isLoading && !stream.interrupt) {
			sessionStorage.removeItem(RUN_KEY(projectId));
		}
	}, [stream.isLoading, stream.interrupt, projectId]);

	const send = useCallback((content: string, model?: string) => {
		if (Date.now() > tokenExpiresAtRef.current - TOKEN_REFRESH_BUFFER_MS) {
			void mintToken(projectId, sessionId).then((resp) => {
				setToken(resp.token);
				tokenExpiresAtRef.current = Date.now() + resp.expiresIn * 1_000;
			});
		}
		stream.submit(
			{ messages: [{ type: "human", content }] },
			{
				onDisconnect: "continue",
				streamResumable: true,
				config: {
					configurable: {
						projectId,
						sessionId,
						thread_id: projectId, // always = projectId
						model: model ?? process.env.NEXT_PUBLIC_DEFAULT_AGENT_MODEL ?? "claude-sonnet-4-6",
					},
				},
			}
		);
	}, [stream, projectId, sessionId]);

	const approveHitl = useCallback((
		decision: "approve" | "reject" | "edit",
		editedArgs?: unknown,
		reason?: string,
	) => {
		stream.submit(null, { command: { resume: { decision, args: editedArgs, reason } } });
	}, [stream]);

	const rejoin = useCallback(() => {
		if (savedRunIdRef.current) void stream.joinStream(savedRunIdRef.current);
	}, [stream]);

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