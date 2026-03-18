"use client";

import type { Channel } from "pusher-js";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AgentStatusPayload,
  StreamChunkPayload,
  StreamEndPayload,
  StreamErrorPayload,
  StreamStartPayload,
} from "@acme/pusher/client";
import { CHANNELS, EVENTS, getPusherClient } from "@acme/pusher/client";

export type AgentStatus =
  | "idle"
  | "thinking"
  | "coding"
  | "running"
  | "completed"
  | "error";

export interface StreamingState {
  isStreaming: boolean;
  messageId: string | null;
  content: string;
  status: AgentStatus;
  statusMessage: string;
  error: string | null;
  fragmentId: string | null;
  sandboxUrl: string | null;
  files: Record<string, string> | null;
}

const initialState: StreamingState = {
  isStreaming: false,
  messageId: null,
  content: "",
  status: "idle",
  statusMessage: "",
  error: null,
  fragmentId: null,
  sandboxUrl: null,
  files: null,
};

export function useStreamingMessage(projectId: string) {
  const [state, setState] = useState<StreamingState>(initialState);
  const channelRef = useRef<Channel | null>(null);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  useEffect(() => {
    const pusher = getPusherClient();
    const channelName = CHANNELS.project(projectId);

    // Subscribe to private channel
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Handle stream start
    channel.bind(EVENTS.MESSAGE_STREAM_START, (data: StreamStartPayload) => {
      setState({
        isStreaming: true,
        messageId: data.messageId,
        content: "",
        status: "thinking",
        statusMessage: "Starting...",
        error: null,
        fragmentId: null,
        sandboxUrl: null,
        files: null,
      });
    });

    // Handle content chunks
    channel.bind(EVENTS.MESSAGE_STREAM_CHUNK, (data: StreamChunkPayload) => {
      setState((prev) => ({
        ...prev,
        content: data.isPartial ? data.content : prev.content + data.content,
      }));
    });

    // Handle stream end
    channel.bind(EVENTS.MESSAGE_STREAM_END, (data: StreamEndPayload) => {
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        content: data.finalContent,
        status: "completed",
        statusMessage: "Done!",
        fragmentId: data.fragmentId ?? null,
        sandboxUrl: data.sandboxUrl ?? null,
        files: data.files ?? null,
      }));
    });

    // Handle errors
    channel.bind(EVENTS.MESSAGE_STREAM_ERROR, (data: StreamErrorPayload) => {
      setState((prev) => ({
        ...prev,
        isStreaming: false,
        status: "error",
        statusMessage: "Error occurred",
        error: data.error,
      }));
    });

    // Handle agent status updates
    channel.bind(EVENTS.AGENT_STATUS, (data: AgentStatusPayload) => {
      setState((prev) => ({
        ...prev,
        status: data.status,
        statusMessage: data.message ?? "",
      }));
    });

    // Cleanup
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [projectId]);

  return {
    ...state,
    reset,
  };
}
