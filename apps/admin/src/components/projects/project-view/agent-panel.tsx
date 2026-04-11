"use client";

import type { AIMessage } from "@langchain/core/messages";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { Fragment } from "@acme/db";
import { HITLCard } from "~/components/agent-panel/hitl-card";
import { MessageForm } from "~/components/agent-panel/message-form";
import { ToolCard } from "~/components/agent-panel/tool-cards";
import { useAgentStream } from "~/hooks/use-agent-stream";
import { useTRPC } from "~/trpc/react";


// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  projectId:         string;
  sessionId:         string; // = projectId, but kept explicit for clarity
  activeFragment:    Fragment | null;
  setActiveFragment: (f: Fragment | null) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubbles
// ─────────────────────────────────────────────────────────────────────────────

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end px-3 pb-4">
      <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({
  message, toolCalls, isStreaming,
}: {
  message:    AIMessage;
  toolCalls:  ReturnType<typeof useAgentStream>["toolCalls"];
  isStreaming?: boolean;
}) {
  const text           = typeof message.content === "string" ? message.content : "";
  const msgToolCallIds = (message.tool_calls ?? []).map((t) => t.id ?? "");
  const relevant       = toolCalls.filter((tc) => msgToolCallIds.includes(tc.call.id));

  return (
    <div className="group flex flex-col px-2 pb-4">
      <div className="mb-1.5 flex items-center gap-2 pl-2">
        <div className="flex h-5 w-5 items-center justify-center">
          <Image src="/logo.svg" alt="VibeCoding" width={16} height={16} className="shrink-0" />
        </div>
        <span className="text-sm font-medium">VibeCoding</span>
        {isStreaming && (
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <span className="text-muted-foreground animate-pulse text-[11px]">Thinking…</span>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-y-2 pl-9">
        {relevant.length > 0 && (
          <div className="space-y-0.5">
            {relevant.map((tc) => <ToolCard key={tc.call.id} toolCall={tc} />)}
          </div>
        )}
        {text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>}
        {isStreaming && !text && relevant.length === 0 && (
          <div className="flex items-center gap-1.5">
            <div className="bg-muted-foreground/40 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
            <div className="bg-muted-foreground/40 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
            <div className="bg-muted-foreground/40 h-1.5 w-1.5 animate-bounce rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AgentPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function AgentPanel({ projectId, sessionId, setActiveFragment }: Props) {
  const trpc       = useTRPC();
  const bottomRef  = useRef<HTMLDivElement>(null);
  const didAutoSend = useRef(false);
  const [model, setModel] = useState("claude-sonnet-4-6");

  // ── Data ────────────────────────────────────────────────────────────────
  // Both queries are pre-fetched by the page server component, so they
  // resolve from cache immediately — no loading state on first render.

  const { data: project } = useSuspenseQuery(
    trpc.projects.getOne.queryOptions({ id: projectId })
  );

  const { data: dbMessages } = useSuspenseQuery(
    trpc.messages.getMany.queryOptions({ projectId })
  );

  // ── Poll project for ngrokUrl ────────────────────────────────────────────
  // The LangGraph server path provisions the sandbox lazily on first tool use.
  // Once ngrok is running, manager.ts writes the URL to project.ngrokUrl.
  // We poll every 3 s so the preview panel lights up as soon as it's ready
  // without requiring the LLM to output the URL as structured JSON.
  const { data: liveProject } = useQuery({
    ...trpc.projects.getOne.queryOptions({ id: projectId }),
    // Refetch every 3 s while we have no ngrokUrl yet. Once we have a URL
    // the fragment is already set and the panel shows the preview, so we
    // stop polling to avoid unnecessary DB hits.
    refetchInterval: (query) => {
      const url = (query.state.data as typeof project | undefined)?.ngrokUrl;
      return url ? false : 3_000;
    },
  });

  // ── Stream ──────────────────────────────────────────────────────────────
  const { messages, isStreaming, toolCalls, interrupt, error, canRejoin, send, approveHitl, rejoin, isReady } =
    useAgentStream({
      projectId,
      sessionId,
      onFragment: (frag) => {
        setActiveFragment({
          id:         crypto.randomUUID(),
          messageId:  "",
          sandboxUrl: frag.sandboxUrl,
          title:      frag.title,
          files:      frag.files,
          createdAt:  new Date(),
          updatedAt:  new Date(),
        });
      },
    });

  // ── Sync ngrokUrl from DB poll into the active fragment ──────────────────
  // When the LangGraph server path finishes sandbox provisioning, the ngrok
  // URL appears in project.ngrokUrl (via the lifecycle manager writing to DB).
  // We detect it here and push it into activeFragment so FragmentWeb can
  // display the preview — without relying on the LLM to output it as JSON.
  useEffect(() => {
    const url = liveProject?.ngrokUrl ?? project.ngrokUrl;
    if (!url) return;

    setActiveFragment((prev) => {
      // Already have a fragment with this URL — nothing to do.
      if (prev?.sandboxUrl === url) return prev;
      return {
        id:         prev?.id ?? crypto.randomUUID(),
        messageId:  prev?.messageId ?? "",
        sandboxUrl: url,
        title:      prev?.title ?? "Preview",
        files:      prev?.files ?? {},
        createdAt:  prev?.createdAt ?? new Date(),
        updatedAt:  new Date(),
      };
    });
  }, [liveProject?.ngrokUrl, project.ngrokUrl]);

  // ── Auto-send for NEW projects ──────────────────────────────────────────
  //
  // "New project" = DB has a USER message but NO ASSISTANT response yet.
  // We read the first USER message and send it to the agent automatically.
  //
  // This replaces the ?prompt URL param approach entirely.
  // Works on any load — including if the user refreshes before the agent replies.

  useEffect(() => {
    if (!isReady || didAutoSend.current) return;

    const firstUserMessage = dbMessages.find((m) => m.role === "USER");
    if (!firstUserMessage) return;

    const hasAssistantInDb     = dbMessages.some((m) => m.role === "ASSISTANT");
    const hasAiInThread        = messages.some((m) => m._getType() === "ai");

    // Both conditions must be false: no DB reply AND no thread reply.
    // If either has an AI response, this is an existing conversation — skip.
    if (hasAssistantInDb || hasAiInThread) return;

    didAutoSend.current = true;
    send(firstUserMessage.content, project.model ?? model);
  }, [isReady, dbMessages, messages, send, project.model, model]);

  // ── Sync model from project ─────────────────────────────────────────────
  useEffect(() => {
    if (project.model) setModel(project.model);
  }, [project.model]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isStreaming]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="py-3 pr-1">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <p className="text-muted-foreground text-sm">
                {isReady ? "Starting conversation…" : "Loading…"}
              </p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1;
            if (msg._getType() === "human") {
              return <UserBubble key={msg.id ?? i} content={typeof msg.content === "string" ? msg.content : ""} />;
            }
            if (msg._getType() === "ai") {
              return (
                <AssistantBubble
                  key={msg.id ?? i}
                  message={msg as AIMessage}
                  toolCalls={toolCalls}
                  isStreaming={isStreaming && isLast}
                />
              );
            }
            return null;
          })}

          {interrupt && (
            <HITLCard
              interrupt={interrupt as { value: unknown }}
              onRespond={({ decision, args, reason }: { decision: "approve" | "reject" | "edit"; args?: unknown; reason?: string }) =>
                approveHitl(decision, args, reason)
              }
            />
          )}

          {error && (
            <div className="mx-2 my-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {String(error)}
            </div>
          )}

          {canRejoin && !isStreaming && (
            <div className="mx-2 my-2 flex items-center justify-between rounded-lg border border-blue-400/40 bg-blue-50/50 px-3 py-2 text-sm dark:border-blue-500/30 dark:bg-blue-950/20">
              <span className="text-blue-700 dark:text-blue-300">Agent ran while you were away</span>
              <button onClick={rejoin} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                Rejoin stream
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="relative px-3 pb-3 pt-1">
        <div className="to-background pointer-events-none absolute -top-8 right-0 left-0 h-8 bg-gradient-to-b from-transparent" />
        <MessageForm
          projectId={projectId}
          isPending={isStreaming}
          model={model}
          onModelChange={setModel}
          onSubmit={(value) => send(value, model)}
        />
      </div>
    </div>
  );
}
