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
  switch (status) {
    case "thinking":
      return (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </span>
      );
    case "coding":
      return (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
        </span>
      );
    case "running":
      return (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
      );
    case "error":
      return (
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      );
    default:
      return null;
  }
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
        error && "text-red-700 dark:text-red-500"
      )}
    >
      <div className="mb-2 flex items-center gap-2 pl-2">
        <Image
          src="/logo.svg"
          alt="Blitz"
          width={18}
          height={18}
          className="shrink-0"
        />
        <span className="text-sm font-medium">Blitz</span>
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <span className="text-muted-foreground animate-pulse text-xs">
            {statusMessage}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-y-4 pl-8.5">
        {error ? (
          <span>{error}</span>
        ) : content ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <span className="text-muted-foreground animate-pulse">
            Processing your request...
          </span>
        )}
      </div>
    </div>
  );
}
