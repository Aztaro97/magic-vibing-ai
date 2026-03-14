import Image from "next/image";
import { format } from "date-fns";

import type { Fragment, MessageType } from "@acme/db";
import { cn } from "@acme/ui";

import FragmentCard from "./fragment-card";

interface AssistatnMessageProps {
  content: string;
  fragment: Fragment | null;
  createdAt: Date;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
  type: MessageType;
}

function AssistantMessage({
  content,
  createdAt,
  fragment,
  isActiveFragment,
  onFragmentClick,
  type,
}: AssistatnMessageProps) {
  return (
    <div
      className={cn(
        "group flex flex-col px-2 pb-4",
        type === "ERROR" && "text-red-600 dark:text-red-400",
      )}
    >
      <div className="mb-1.5 flex items-center gap-2 pl-2">
        <div className="flex h-5 w-5 items-center justify-center">
          <Image
            src="/logo.svg"
            alt="VibeCoding"
            height={16}
            width={16}
            className="shrink-0"
          />
        </div>
        <span className="text-sm font-medium">VibeCoding</span>
        <span className="text-muted-foreground text-[11px] opacity-0 transition-opacity group-hover:opacity-100">
          {format(createdAt, "HH:mm 'on' MMM dd, yyyy")}
        </span>
      </div>
      <div className="flex flex-col gap-y-3 pl-9">
        <span className="text-sm leading-relaxed">{content}</span>
        {fragment && type === "RESULT" && (
          <FragmentCard
            fragment={fragment}
            isActiveFragment={isActiveFragment}
            onFragmentClick={onFragmentClick}
          />
        )}
      </div>
    </div>
  );
}

export default AssistantMessage;
