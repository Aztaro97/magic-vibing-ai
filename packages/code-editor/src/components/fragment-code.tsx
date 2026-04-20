"use client";

import { useState } from "react";
import { Check, Copy, Download, FileText } from "lucide-react";

import { Button } from "@acme/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@acme/ui/tooltip";

import { CodeView } from "./code-view";

export interface FragmentFile {
  name: string;
  content: string;
}

export interface FragmentCodeProps {
  files: FragmentFile[];
}

export function FragmentCode({ files }: FragmentCodeProps) {
  const [currentFile, setCurrentFile] = useState(files[0]?.name || "");
  const [copied, setCopied] = useState(false);
  const currentFileContent = files.find(
    (file) => file.name === currentFile,
  )?.content;

  function download(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async function copyToClipboard() {
    if (currentFileContent) {
      await navigator.clipboard.writeText(currentFileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-2 pt-1">
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {files.map((file) => (
            <div
              key={file.name}
              className={`text-muted-foreground hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-sm select-none ${
                file.name === currentFile ? "bg-muted border-muted" : ""
              }`}
              onClick={() => setCurrentFile(file.name)}
            >
              <FileText className="h-4 w-4" />
              {file.name}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {copied ? "Copied!" : "Copy"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={() =>
                    download(currentFile, currentFileContent || "")
                  }
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Download</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-x-auto">
        <CodeView
          code={currentFileContent || ""}
          lang={currentFile.split(".").pop() || ""}
        />
      </div>
    </div>
  );
}
