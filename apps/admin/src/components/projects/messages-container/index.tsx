"use client";

import { useEffect, useRef } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import type { Fragment } from "@acme/db";

import { useStreamingMessage } from "~/hooks/use-streaming-message";
import { useTRPC } from "~/trpc/react";
import MessageCard from "./message-card";
import MessageForm from "./message-form";
import MessageLoading from "./message-loading";
import StreamingMessage from "./streaming-message";

interface Props {
  projectId: string;
  activeFragment: Fragment | null;
  setActiveFragment: (fragment: Fragment | null) => void;
}

export default function MessageContainer({
  projectId,
  activeFragment,
  setActiveFragment,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<string | null>(null);
  const trpc = useTRPC();

  // Real-time streaming state
  const streaming = useStreamingMessage(projectId);

  const { data: messages } = useSuspenseQuery(
    trpc.messages.getMany.queryOptions(
      {
        projectId,
      },
      {
        // Reduce polling when streaming is active
        refetchInterval: streaming.isStreaming ? 10000 : 5000,
      },
    ),
  );

  useEffect(() => {
    const assistantMessages = messages.filter(
      (msg) => msg.role === "ASSISTANT",
    );
    const lastAssistantMessage =
      assistantMessages[assistantMessages.length - 1];

    if (
      lastAssistantMessage?.fragment &&
      lastAssistantMessage.id !== lastAssistantMessageRef.current
    ) {
      setActiveFragment(lastAssistantMessage.fragment);
      lastAssistantMessageRef.current = lastAssistantMessage.id;
    }
  }, [messages, setActiveFragment]);

  // Also handle streaming completion to set active fragment
  useEffect(() => {
    if (
      streaming.status === "completed" &&
      streaming.fragmentId &&
      streaming.sandboxUrl &&
      streaming.files
    ) {
      // Create a temporary fragment object for immediate display
      const streamingFragment: Fragment = {
        id: streaming.fragmentId,
        messageId: streaming.messageId!,
        sandboxUrl: streaming.sandboxUrl,
        title: "Fragment",
        files: streaming.files,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setActiveFragment(streamingFragment);
    }
  }, [streaming, setActiveFragment]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streaming.isStreaming, streaming.content]);

  const lastMessage = messages[messages.length - 1];
  const isLastMessageUser = lastMessage?.role === "USER";

  // Determine if we should show streaming UI
  // Show streaming when:
  // 1. We're actively streaming
  // 2. OR the last message is a user message and we haven't started streaming yet
  const showStreamingUI = streaming.isStreaming;
  const showFallbackLoading =
    isLastMessageUser && !streaming.isStreaming && streaming.status === "idle";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="py-3 pr-1">
          {messages.length === 0 &&
            !showStreamingUI &&
            !showFallbackLoading && (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <p className="text-muted-foreground text-sm">
                  Start a conversation to build something
                </p>
              </div>
            )}

          {messages.map((message) => {
            if (streaming.isStreaming && message.id === streaming.messageId) {
              return null;
            }

            return (
              <MessageCard
                key={message.id}
                content={message.content}
                role={message.role}
                fragment={message.fragment}
                createdAt={message.createdAt}
                isActiveFragment={activeFragment?.id === message.fragment?.id}
                onFragmentClick={() => setActiveFragment(message.fragment)}
                type={message.type}
              />
            );
          })}

          {showStreamingUI && (
            <StreamingMessage
              status={streaming.status}
              statusMessage={streaming.statusMessage}
              content={streaming.content}
              error={streaming.error}
            />
          )}

          {showFallbackLoading && <MessageLoading />}

          <div ref={bottomRef} />
        </div>
      </div>
      <div className="relative px-3 pt-1 pb-3">
        <div className="to-background pointer-events-none absolute -top-8 right-0 left-0 h-8 bg-gradient-to-b from-transparent" />
        <MessageForm projectId={projectId} />
      </div>
    </div>
  );
}
