"use client";

import type { ErrorNotification } from "../shared/types";
import { formatErrorForFix } from "./error-toast";

interface ErrorModalProps {
  error: ErrorNotification | null;
  isOpen: boolean;
  onClose: () => void;
  onSendToFix: (message: string) => void;
}

export function ErrorModal({
  error,
  isOpen,
  onClose,
  onSendToFix,
}: ErrorModalProps) {
  if (!isOpen || !error) return null;

  const typeLabel =
    error.type === "runtime-error"
      ? "Runtime Error"
      : error.type === "build-error"
        ? "Build Error"
        : error.type === "sandbox-error"
          ? "Sandbox Error"
          : "Error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="bg-background relative z-10 mx-4 flex w-full max-w-lg flex-col gap-4 rounded-xl border p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-foreground text-lg font-semibold">
              {typeLabel}
            </h2>
            {error.source && (
              <span className="text-muted-foreground text-xs">
                Source: {error.source}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg"
          >
            ✕
          </button>
        </div>

        {/* Error message */}
        <div className="bg-muted max-h-64 overflow-auto rounded-md p-3">
          <pre className="text-foreground text-sm whitespace-pre-wrap">
            {error.message}
          </pre>
        </div>

        {/* Metadata */}
        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <span>{new Date(error.timestamp).toLocaleTimeString()}</span>
          {error.projectId && <span>Project: {error.projectId}</span>}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded border px-3 py-1.5 text-sm"
          >
            Dismiss
          </button>
          <button
            onClick={() => onSendToFix(formatErrorForFix(error.message))}
            className="bg-destructive text-destructive-foreground rounded px-3 py-1.5 text-sm font-medium"
          >
            Send to Fix
          </button>
        </div>
      </div>
    </div>
  );
}
