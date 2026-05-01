"use client";

import type { AIMessage } from "@langchain/core/messages";
import type { ToolCallWithResult } from "@langchain/react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

import type { Fragment } from "@acme/db";

import { useAgentStream } from "~/hooks/use-agent-stream";
import { HITLCard } from "./hitl-card";
import { MessageForm } from "./message-form";
import { ToolCard } from "./tool-cards";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  sessionId: string;
  activeFragment: Fragment | null;
  setActiveFragment: (f: Fragment | null) => void;
  /** Present only on new-project creation — auto-sent once on mount */
  initialPrompt?: string;
  /** Model selected in ProjectForm — pre-selected in the chat form */
  initialModel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble components
// ─────────────────────────────────────────────────────────────────────────────

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end px-3 pb-4">
      <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl rounded-tr-md px-3.5 py-2.5 text-sm">
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
  message: AIMessage;
  toolCalls: ToolCallWithResult[];
  isStreaming?: boolean;
}) {
  const text = typeof message.content === "string" ? message.content : "";
  const msgToolCallIds = (message.tool_calls ?? []).map((t) => t.id ?? "");
  const relevant = toolCalls.filter((tc: ToolCallWithResult) =>
    msgToolCallIds.includes(tc.call.id ?? ""),
  );

  return (
    <div className="group flex flex-col px-2 pb-4">
      <div className="mb-1.5 flex items-center gap-2 pl-2">
        <div className="flex h-5 w-5 items-center justify-center">
          <Image
            src="/logo.svg"
            alt="VibeCoding"
            width={16}
            height={16}
            className="shrink-0"
          />
        </div>
        <span className="text-sm font-medium">VibeCoding</span>
        {isStreaming && (
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <span className="text-muted-foreground animate-pulse text-[11px]">
              Thinking…
            </span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-y-2 pl-9">
        {relevant.length > 0 && (
          <div className="space-y-0.5">
            {relevant.map((tc: ToolCallWithResult, i) => (
              <ToolCard
                key={tc.call.id ?? `${tc.call.name}-${i}`}
                toolCall={tc}
              />
            ))}
          </div>
        )}
        {text && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        )}
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
// Live activity strip — orphaned tool calls not yet attached to any message.
// Handles the gap between a tool being dispatched and its AI message arriving.
// ─────────────────────────────────────────────────────────────────────────────

function LiveActivityStrip({ toolCalls }: { toolCalls: ToolCallWithResult[] }) {
  if (toolCalls.length === 0) return null;
  return (
    <div className="px-2 pb-2">
      <div className="space-y-0.5">
        {toolCalls.map((tc: ToolCallWithResult, i) => (
          <ToolCard key={tc.call.id ?? `${tc.call.name}-${i}`} toolCall={tc} />
        ))}
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const didAutoSend = useRef(false);
  const [model, setModel] = useState(initialModel ?? "claude-sonnet-4-6");

  const {
    messages,
    isStreaming,
    toolCalls: rawToolCalls,
    interrupt,
    error,
    canRejoin,
    send,
    approveHitl,
    rejoin,
    isReady,
    disconnect,
  } = useAgentStream({
    projectId,
    sessionId,
    onFragment: (frag) => {
      setActiveFragment({
        id: crypto.randomUUID(),
        messageId: "",
        sandboxUrl: frag.sandboxUrl,
        title: frag.title,
        files: frag.files,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    },
  });

  // Coerce to typed array — useStream's toolCalls inference degrades to any[]
  // when the hook's return type can't be resolved across package boundaries.
  const toolCalls = rawToolCalls as ToolCallWithResult[];

  // Collect all tool-call IDs that already belong to a rendered AI message.
  // Any call NOT in this set is "orphaned" — dispatched before its AI message
  // has streamed. We surface those in the LiveActivityStrip below.
  const attachedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const msg of messages) {
      if (msg._getType() === "ai") {
        for (const tc of (msg as AIMessage).tool_calls ?? []) {
          if (tc.id) ids.add(tc.id);
        }
      }
    }
    return ids;
  }, [messages]);

  const orphanedToolCalls = useMemo(
    () =>
      toolCalls.filter(
        (tc: ToolCallWithResult) => !attachedIds.has(tc.call.id ?? ""),
      ),
    [toolCalls, attachedIds],
  );

  // ── Auto-send the initial prompt once the stream hook is ready ─────────────
  useEffect(() => {
    if (!initialPrompt || !isReady || didAutoSend.current) return;
    if (messages.length > 0) {
      didAutoSend.current = true;
      return;
    }
    didAutoSend.current = true;
    send(initialPrompt, model);
  }, [initialPrompt, isReady, messages.length, model, send]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, toolCalls.length, isStreaming]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="py-3 pr-1">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <p className="text-muted-foreground text-sm">
                Start a conversation to build something
              </p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1;
            if (msg._getType() === "human") {
              return (
                <UserBubble
                  key={msg.id ?? i}
                  content={typeof msg.content === "string" ? msg.content : ""}
                />
              );
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

          {/* Orphaned tool calls: dispatched but not yet in an AI message */}
          {isStreaming && <LiveActivityStrip toolCalls={orphanedToolCalls} />}

          {interrupt && (
            <HITLCard
              interrupt={interrupt as { value: unknown }}
              onRespond={({
                decision,
                args,
                reason,
              }: {
                decision: "approve" | "reject" | "edit";
                args?: unknown;
                reason?: string;
              }) => approveHitl(decision, args, reason)}
            />
          )}

          {error && (
            <div className="border-destructive/40 bg-destructive/5 text-destructive mx-2 my-2 rounded-lg border px-3 py-2 text-sm">
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
                className="cursor-pointer font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Rejoin stream
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="relative px-3 pt-1 pb-3">
        <div className="to-background pointer-events-none absolute -top-8 right-0 left-0 h-8 bg-gradient-to-b from-transparent" />
        <MessageForm
          projectId={projectId}
          isPending={isStreaming}
          model={model}
          onModelChange={setModel}
          onSubmit={(value) => send(value, model)}
          onStop={disconnect}
        />
      </div>
    </div>
  );
}
