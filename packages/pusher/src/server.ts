import Pusher from "pusher";

import { env } from "../env";

// Lazy initialization to avoid issues during build
let pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: env.PUSHER_APP_ID,
      key: env.NEXT_PUBLIC_PUSHER_KEY,
      secret: env.PUSHER_SECRET,
      cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return pusherServer;
}

// Channel naming conventions
export const CHANNELS = {
  project: (projectId: string) => `private-project-${projectId}`,
  message: (messageId: string) => `private-message-${messageId}`,
} as const;

// Event types for streaming
export const EVENTS = {
  // Message streaming events
  MESSAGE_STREAM_START: "message:stream:start",
  MESSAGE_STREAM_CHUNK: "message:stream:chunk",
  MESSAGE_STREAM_END: "message:stream:end",
  MESSAGE_STREAM_ERROR: "message:stream:error",
  // Status events
  AGENT_STATUS: "agent:status",
} as const;

// Types for streaming events
export interface StreamStartPayload {
  messageId: string;
  projectId: string;
  timestamp: number;
}

export interface StreamChunkPayload {
  messageId: string;
  content: string;
  isPartial: boolean;
  timestamp: number;
}

export interface StreamEndPayload {
  messageId: string;
  finalContent: string;
  fragmentId?: string;
  sandboxUrl?: string;
  files?: Record<string, string>;
  timestamp: number;
}

export interface StreamErrorPayload {
  messageId: string;
  error: string;
  timestamp: number;
}

export interface AgentStatusPayload {
  projectId: string;
  status: "thinking" | "coding" | "running" | "completed" | "error";
  message?: string;
  timestamp: number;
}

// Helper functions for triggering events
export async function triggerStreamStart(
  projectId: string,
  payload: StreamStartPayload,
): Promise<void> {
  const pusher = getPusherServer();
  await pusher.trigger(
    CHANNELS.project(projectId),
    EVENTS.MESSAGE_STREAM_START,
    payload,
  );
}

export async function triggerStreamChunk(
  projectId: string,
  payload: StreamChunkPayload,
): Promise<void> {
  const pusher = getPusherServer();
  await pusher.trigger(
    CHANNELS.project(projectId),
    EVENTS.MESSAGE_STREAM_CHUNK,
    payload,
  );
}

export async function triggerStreamEnd(
  projectId: string,
  payload: StreamEndPayload,
): Promise<void> {
  const pusher = getPusherServer();
  await pusher.trigger(
    CHANNELS.project(projectId),
    EVENTS.MESSAGE_STREAM_END,
    payload,
  );
}

export async function triggerStreamError(
  projectId: string,
  payload: StreamErrorPayload,
): Promise<void> {
  const pusher = getPusherServer();
  await pusher.trigger(
    CHANNELS.project(projectId),
    EVENTS.MESSAGE_STREAM_ERROR,
    payload,
  );
}

export async function triggerAgentStatus(
  projectId: string,
  payload: AgentStatusPayload,
): Promise<void> {
  const pusher = getPusherServer();
  await pusher.trigger(
    CHANNELS.project(projectId),
    EVENTS.AGENT_STATUS,
    payload,
  );
}

export { Pusher };
