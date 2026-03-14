import { ChevronRightIcon, Code2Icon } from "lucide-react";

import type { Fragment } from "@acme/db";
import { cn } from "@acme/ui";

interface FragmentProps {
  fragment: Fragment | null;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
}

function FragmentCard({
  fragment,
  isActiveFragment,
  onFragmentClick,
}: FragmentProps) {
  return (
    <button
      className={cn(
        "flex w-fit items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-start transition-all duration-150",
        isActiveFragment
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "bg-muted/50 hover:bg-muted hover:border-border",
      )}
      onClick={() => {
        if (fragment) {
          onFragmentClick(fragment);
        }
      }}
    >
      <Code2Icon className="h-4 w-4 shrink-0 opacity-70" />
      <div className="flex flex-col">
        <span className="text-xs font-medium">{fragment?.title}</span>
        <span className="text-muted-foreground text-[11px]">
          Click to preview
        </span>
      </div>
      <ChevronRightIcon className="h-3.5 w-3.5 opacity-50" />
    </button>
  );
}

export default FragmentCard;
