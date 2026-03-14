"use client";

import type { ErrorNotification } from "../shared/types";

interface ErrorToastProps {
  error: ErrorNotification;
  onDismiss: () => void;
  onSendToFix: (message: string) => void;
  onViewDetails: () => void;
}

export function ErrorToast({
  error,
  onDismiss,
  onSendToFix,
  onViewDetails,
}: ErrorToastProps) {
  const typeLabel =
    error.type === "runtime-error"
      ? "Runtime Error"
      : error.type === "build-error"
        ? "Build Error"
        : error.type === "sandbox-error"
          ? "Sandbox Error"
          : "Error";

  return (
    <div className="bg-destructive/10 border-destructive/30 flex w-full max-w-sm flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-destructive text-xs font-semibold uppercase">
            {typeLabel}
          </span>
          {error.source && (
            <span className="text-muted-foreground text-xs">
              {error.source}
            </span>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          ✕
        </button>
      </div>
      <p className="text-foreground line-clamp-3 text-sm">{error.message}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onSendToFix(formatErrorForFix(error.message))}
          className="bg-destructive text-destructive-foreground rounded px-2 py-1 text-xs font-medium"
        >
          Send to Fix
        </button>
        <button
          onClick={onViewDetails}
          className="text-muted-foreground hover:text-foreground text-xs underline"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

/**
 * Format an error message for the chat "fix" prompt.
 */
export function formatErrorForFix(message: string): string {
  return `Fix this error:\n\`\`\`\n${message}\n\`\`\``;
}
