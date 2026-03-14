import { useEffect, useState } from "react";
import Image from "next/image";

const MESSAGES = [
  "Analyzing your request...",
  "Setting things up...",
  "Thinking through logic...",
  "Structuring the code...",
  "Wiring everything together...",
  "Almost there...",
];

function MessageLoading() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col px-2 pb-4">
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
      </div>
      <div className="flex items-center gap-2 pl-9">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500/60 [animation-delay:-0.3s]" />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500/60 [animation-delay:-0.15s]" />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500/60" />
        </div>
        <span className="text-muted-foreground animate-pulse text-xs">
          {MESSAGES[index]}
        </span>
      </div>
    </div>
  );
}

export default MessageLoading;
