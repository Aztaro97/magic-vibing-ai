import { useEffect, useState } from "react";
import Image from "next/image";

const ShimmerMessages = () => {
  const messages = [
    "Thinking through logic...",
    "Loading your workspace...",
    "Analyzing your request...",
    "Setting things up...",
    "Structuring the code...",
    "Wiring everything together...",
    "Refining the output...",
    "Making things efficient...",
    "Putting on the final layer...",
    "Almost done, hang tight...",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground animate-pulse text-base">
        {messages[currentMessageIndex]}
      </span>
    </div>
  );
};

function MessageLoading() {
  return (
    <div className="group flex flex-col px-2 pb-4">
      <div className="mb-2 flex items-center gap-2 pl-2">
        <Image
          src="/logo.svg"
          alt="Blitz"
          width={18}
          height={18}
          className="shrink-0"
        />
        <span className="text-sm font-medium">Blitz</span>
      </div>
      <div className="flex flex-col gap-y-4 pl-8.5">
        <ShimmerMessages />
      </div>
    </div>
  );
}

export default MessageLoading;
