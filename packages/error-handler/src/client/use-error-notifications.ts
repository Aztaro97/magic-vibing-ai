"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Channel } from "pusher-js";
import { CHANNELS, getPusherClient } from "@acme/pusher/client";

import type { ErrorNotification } from "../shared/types";
import { ERROR_EVENT } from "../server/error-notifier";

export interface UseErrorNotificationsOptions {
  /** Callback when user clicks "Send to Fix" */
  onSendToFix?: (message: string) => void;
  /** Override the Pusher channel name */
  channelName?: string;
  /** Enable deduplication of identical errors (default: true) */
  deduplicate?: boolean;
  /** Max errors to keep in state (default: 50) */
  maxErrors?: number;
}

export interface UseErrorNotificationsReturn {
  /** Whether the error modal is open */
  isModalOpen: boolean;
  /** The error currently displayed in the modal */
  errorModalData: ErrorNotification | null;
  /** Close the error modal */
  handleCloseModal: () => void;
  /** Send error to AI for fixing */
  handleSendToFix: (message: string) => void;
  /** All accumulated errors */
  errors: ErrorNotification[];
  /** Clear all errors */
  clearErrors: () => void;
  /** Open the modal for a specific error */
  openErrorModal: (error: ErrorNotification) => void;
}

export function useErrorNotifications(
  projectId: string | undefined,
  options: UseErrorNotificationsOptions = {},
): UseErrorNotificationsReturn {
  const { onSendToFix, channelName, deduplicate = true, maxErrors = 50 } = options;

  const [errors, setErrors] = useState<ErrorNotification[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorModalData, setErrorModalData] = useState<ErrorNotification | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const seenHashes = useRef<Set<string>>(new Set());

  const clearErrors = useCallback(() => {
    setErrors([]);
    seenHashes.current.clear();
  }, []);

  const openErrorModal = useCallback((error: ErrorNotification) => {
    setErrorModalData(error);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setErrorModalData(null);
  }, []);

  const handleSendToFix = useCallback(
    (message: string) => {
      onSendToFix?.(message);
      handleCloseModal();
    },
    [onSendToFix, handleCloseModal],
  );

  useEffect(() => {
    if (!projectId) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(
      channelName ?? CHANNELS.project(projectId),
    );
    channelRef.current = channel;

    channel.bind(ERROR_EVENT, (data: ErrorNotification) => {
      // Deduplication
      if (deduplicate) {
        const hash = data.message.slice(0, 120);
        if (seenHashes.current.has(hash)) return;
        seenHashes.current.add(hash);
      }

      setErrors((prev) => {
        const next = [...prev, data];
        return next.length > maxErrors ? next.slice(-maxErrors) : next;
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName ?? CHANNELS.project(projectId));
      channelRef.current = null;
    };
  }, [projectId, channelName, deduplicate, maxErrors]);

  return {
    isModalOpen,
    errorModalData,
    handleCloseModal,
    handleSendToFix,
    errors,
    clearErrors,
    openErrorModal,
  };
}
