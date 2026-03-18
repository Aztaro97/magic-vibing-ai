"use client";

import type { Fragment } from "@acme/db";
import type { AIMessage } from "@langchain/core/messages";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAgentStream } from "~/hooks/use-agent-stream";
import { HITLCard } from "./hitl-card";
import { MessageForm } from "./message-form";
import { ToolCard } from "./tool-cards";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  projectId:         string;
  sessionId:         string;
  activeFragment:    Fragment | null;
  setActiveFragment: (f: Fragment | null) => void;
  /** Present only on new-project creation — auto-sent once on mount */
  initialPrompt?:    string;
  /** Model selected in ProjectForm — pre-selected in the chat form */
  initialModel?:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble components
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
  message,
  toolCalls,
  isStreaming,
}: {
  message:     AIMessage;
  toolCalls:   ReturnType<typeof useAgentStream>["toolCalls"];
  isStreaming?: boolean;
}) {
  const text              = typeof message.content === "string" ? message.content : "";
  const msgToolCallIds    = (message.tool_calls ?? []).map((t) => t.id ?? "");
  const relevant          = toolCalls.filter((tc) => msgToolCallIds.includes(tc.call.id));

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

export default function AgentPanel({
  projectId,
  sessionId,
  setActiveFragment,
  initialPrompt,
  initialModel,
}: Props) {
  const router     = useRef(useRouter());
  const bottomRef  = useRef<HTMLDivElement>(null);
  const didAutoSend = useRef(false);
  const [model, setModel] = useState(initialModel ?? "claude-sonnet-4-6");

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

  // ── Auto-send the initial prompt once the stream hook is ready ─────────────
  // Only fires on new-project creation (initialPrompt is present).
  // isReady becomes true once the JWT has been minted by /api/agent/token,
  // which means the LangGraph server can accept the first message.
  useEffect(() => {
    if (!initialPrompt || !isReady || didAutoSend.current) return;
    didAutoSend.current = true;

    // Strip ?prompt and ?model from the URL so a page refresh doesn't
    // re-trigger the agent with the same message.
    const cleanUrl = window.location.pathname;
    router.current.replace(cleanUrl);

    send(initialPrompt, model);
  }, [initialPrompt, isReady, model, send]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isStreaming]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="py-3 pr-1">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <p className="text-muted-foreground text-sm">
                Start a conversation to build something
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
              <span className="text-blue-700 dark:text-blue-300">
                Agent ran while you were away
              </span>
              <button
                onClick={rejoin}
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
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