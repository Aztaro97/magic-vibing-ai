import { useState } from "react";
import { ExternalLinkIcon, RefreshCcwIcon } from "lucide-react";
import { toast } from "sonner";

import type { Fragment } from "@acme/db";
import { Button } from "@acme/ui/button";
import Hint from "@acme/ui/hint";

interface Props {
  data: Fragment;
}

function FragmentWeb({ data }: Props) {
  const [copied, setCopied] = useState(false);
  const [fragmentKey, setFragmentKey] = useState(0);

  const onRefresh = () => {
    setFragmentKey((prev) => prev + 1);
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(data.sandboxUrl);
    toast.success("URL copied to clipboard");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="bg-card/50 flex items-center gap-2 border-b px-3 py-2 backdrop-blur-sm">
        <Hint text="Refresh" side="bottom" align="end">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onRefresh}
          >
            <RefreshCcwIcon className="h-3.5 w-3.5" />
          </Button>
        </Hint>
        <Hint text="Copy sandbox URL" side="bottom" align="end">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            disabled={!data.sandboxUrl || copied}
            className="text-muted-foreground h-7 flex-1 justify-start truncate px-2 text-xs font-normal"
          >
            <span className="truncate">{data.sandboxUrl || "No URL"}</span>
          </Button>
        </Hint>
        <Hint text="Open in new tab" side="bottom" align="start">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              if (data.sandboxUrl) {
                window.open(data.sandboxUrl, "_blank");
              }
            }}
            disabled={!data.sandboxUrl}
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </Button>
        </Hint>
      </div>
      <iframe
        key={fragmentKey}
        className="h-full w-full flex-1"
        sandbox="allow-forms allow-scripts allow-same-origin"
        loading="lazy"
        src={data.sandboxUrl}
      />
    </div>
  );
}

export default FragmentWeb;
