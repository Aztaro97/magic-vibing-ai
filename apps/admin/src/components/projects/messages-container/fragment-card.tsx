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
    <>
      <button
        className={cn(
          "bg-muted hover:bg-secondary flex w-fit items-start gap-2 rounded-lg border p-3 text-start transition-colors",
          isActiveFragment &&
            "bg-primary text-primary-foreground border-primary hover:bg-primary",
        )}
        onClick={() => {
          if (fragment) {
            onFragmentClick(fragment);
          }
        }}
      >
        <Code2Icon className="mt-0.5 size-4" />
        <div className="flex flex-1 flex-col">
          <span className="line-clamp-1 text-sm font-medium">
            {fragment?.title}
          </span>
          <span className="text-sm">Preview</span>
        </div>
        <div className="mt-0.5 flex items-center justify-center">
          <ChevronRightIcon className="size-4" />
        </div>
      </button>
    </>
  );
}

export default FragmentCard;
