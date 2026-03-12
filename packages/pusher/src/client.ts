import PusherClient from "pusher-js";

import { env } from "../env";

// Lazy initialization for client-side Pusher
let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!pusherClient) {
    pusherClient = new PusherClient(env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
      forceTLS: true,
    });
  }
  return pusherClient;
}

// Re-export channel and event constants for client use
export { CHANNELS, EVENTS } from "./server";
export type {
  StreamStartPayload,
  StreamChunkPayload,
  StreamEndPayload,
  StreamErrorPayload,
  AgentStatusPayload,
} from "./server";

export { PusherClient };
