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
        "group pb-4: flex flex-col px-2",
        type === "ERROR" && "text-red-700 dark:text-red-500",
      )}
    >
      <div className="mb-2 flex items-center gap-2 pl-2">
        <Image
          src={"/logo.svg"}
          alt="blitz"
          height={18}
          width={18}
          className="shrink-0"
        />
        <span className="text-sm font-medium">Blitz</span>
        <span className="text-muted-foreground text-xs opacity-0 transition-opacity group-hover:opacity-100">
          {format(createdAt, "HH:mm 'on' MMM dd, yyyy")}
        </span>
      </div>
      <div className="flex flex-col gap-y-4 pl-8.5">
        <span>{content}</span>
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
