import Image from "next/image";

import { cn } from "@acme/ui";

import type { AgentStatus } from "~/hooks/use-streaming-message";

interface StreamingMessageProps {
  status: AgentStatus;
  statusMessage: string;
  content: string;
  error: string | null;
}

const StatusIcon = ({ status }: { status: AgentStatus }) => {
  const colors: Record<string, string> = {
    thinking: "bg-blue-500",
    coding: "bg-amber-500",
    running: "bg-green-500",
    error: "bg-red-500",
  };

  const color = colors[status];
  if (!color) return null;

  return (
    <span className="relative flex h-2 w-2">
      {status !== "error" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            color,
          )}
        />
      )}
      <span
        className={cn("relative inline-flex h-2 w-2 rounded-full", color)}
      />
    </span>
  );
};

export default function StreamingMessage({
  status,
  statusMessage,
  content,
  error,
}: StreamingMessageProps) {
  return (
    <div
      className={cn(
        "group flex flex-col px-2 pb-4",
        error && "text-red-600 dark:text-red-400",
      )}
    >
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
        <div className="flex items-center gap-1.5">
          <StatusIcon status={status} />
          <span className="text-muted-foreground animate-pulse text-[11px]">
            {statusMessage}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-y-3 pl-9">
        {error ? (
          <span className="text-sm">{error}</span>
        ) : content ? (
          <span className="text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </span>
        ) : (
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
