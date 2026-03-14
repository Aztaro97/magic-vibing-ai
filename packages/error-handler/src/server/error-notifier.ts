import { filterSensitiveData, matchesExpoError } from "../shared/patterns";
import type { ErrorNotification } from "../shared/types";

// ── Pusher integration ──────────────────────────────────────────────
// We import from @acme/pusher at the server level. The error-handler
// extends the existing channel convention with a dedicated error event.

import { CHANNELS, getPusherServer } from "@acme/pusher/server";

/**
 * Error-specific Pusher event name.
 * Fired on the project channel: `private-project-${projectId}`
 */
export const ERROR_EVENT = "error:notification" as const;

/**
 * Get the channel name for error notifications (same as project channel).
 */
export function getErrorChannelName(projectId: string): string {
  return CHANNELS.project(projectId);
}

/**
 * Get the error event name.
 */
export function getErrorEventName(): string {
  return ERROR_EVENT;
}

// ── Deduplication buffer ────────────────────────────────────────────

interface BufferEntry {
  hash: string;
  timestamp: number;
}

const errorBuffer = new Map<string, BufferEntry[]>();
const BUFFER_WINDOW_MS = 5_000; // Deduplicate within 5 seconds

function hashMessage(msg: string): string {
  // Simple hash — first 120 chars is enough for dedup
  return msg.slice(0, 120);
}

function isDuplicate(projectId: string, message: string): boolean {
  const now = Date.now();
  const hash = hashMessage(message);
  const entries = errorBuffer.get(projectId) ?? [];

  // Prune stale entries
  const fresh = entries.filter((e) => now - e.timestamp < BUFFER_WINDOW_MS);
  errorBuffer.set(projectId, fresh);

  if (fresh.some((e) => e.hash === hash)) {
    return true;
  }

  fresh.push({ hash, timestamp: now });
  return false;
}

/**
 * Clear the deduplication buffer for a project.
 */
export function clearErrorBuffer(projectId: string): void {
  errorBuffer.delete(projectId);
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Scan a log line for Expo/React Native runtime errors.
 * If a match is found, send a real-time notification via Pusher.
 */
export function detectAndNotifyRuntimeError(
  logData: string,
  projectId?: string,
): void {
  if (!projectId) return;
  if (!matchesExpoError(logData)) return;

  const filtered = filterSensitiveData(logData.trim());
  if (isDuplicate(projectId, filtered)) return;

  const notification: ErrorNotification = {
    message: filtered,
    timestamp: new Date().toISOString(),
    projectId,
    type: "runtime-error",
    source: "expo-server",
  };

  // Fire and forget — we don't want error notification failures to
  // break the sandbox log stream.
  void triggerErrorNotification(projectId, notification);
}

/**
 * Send a custom error notification to the project channel.
 */
export async function sendCustomErrorNotification(
  projectId: string,
  message: string,
  type: ErrorNotification["type"] = "custom",
  source: ErrorNotification["source"] = "custom",
): Promise<void> {
  const filtered = filterSensitiveData(message);
  const notification: ErrorNotification = {
    message: filtered,
    timestamp: new Date().toISOString(),
    projectId,
    type,
    source,
  };

  await triggerErrorNotification(projectId, notification);
}

// ── Internal ────────────────────────────────────────────────────────

async function triggerErrorNotification(
  projectId: string,
  notification: ErrorNotification,
): Promise<void> {
  try {
    const pusher = getPusherServer();
    await pusher.trigger(
      getErrorChannelName(projectId),
      ERROR_EVENT,
      notification,
    );
  } catch (err) {
    // Swallow Pusher failures — we don't want error notifications to
    // cascade into more errors.
    console.error("[error-handler] Failed to send notification:", err);
  }
}
