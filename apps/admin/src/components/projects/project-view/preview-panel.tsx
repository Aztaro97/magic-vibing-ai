"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CopyIcon, Loader2Icon, SmartphoneIcon } from "lucide-react";
import { useQRCode } from "next-qrcode";

import { CodePanel, type FileItem } from "@acme/code-editor/components";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";

import { useTRPC } from "~/trpc/react";

interface PreviewPanelProps {
  projectId: string;
  mode: "preview" | "code";
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Loader2Icon className="mx-auto mb-4 h-8 w-8 animate-spin" />
        <p className="mb-2 text-lg font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}

export function PreviewPanel({ projectId, mode }: PreviewPanelProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { Canvas } = useQRCode();

  const { data: project } = useSuspenseQuery(
    trpc.projects.getOne.queryOptions({ id: projectId }),
  );

  const [isIframeLoading, setIsIframeLoading] = useState(true);

  const previewUrl = project.ngrokUrl ?? undefined;
  const sandboxReady = Boolean(project.sandboxId);

  const fetchStructure = useCallback(async (): Promise<FileItem[]> => {
    const data = await queryClient.fetchQuery(
      trpc.sandbox.getStructure.queryOptions({ projectId }),
    );
    return data.structure;
  }, [queryClient, trpc, projectId]);

  const fetchFileContent = useCallback(
    async (filePath: string): Promise<string> => {
      const data = await queryClient.fetchQuery(
        trpc.sandbox.getFile.queryOptions({ projectId, filePath }),
      );
      return data.content;
    },
    [queryClient, trpc, projectId],
  );

  const editFile = useMutation(trpc.sandbox.editFile.mutationOptions());

  const saveFile = useCallback(
    async (filePath: string, content: string): Promise<void> => {
      await editFile.mutateAsync({ projectId, filePath, content });
    },
    [editFile, projectId],
  );

  const qrText = useMemo(
    () => (previewUrl ? previewUrl.replace(/^https?:\/\//, "exp://") : null),
    [previewUrl],
  );

  const handleCopyUrl = useCallback(() => {
    if (previewUrl) {
      void navigator.clipboard.writeText(previewUrl);
    }
  }, [previewUrl]);

  if (mode === "code") {
    return (
      <div className="h-full">
        <CodePanel
          projectId={projectId}
          hideHeader
          fetchStructure={fetchStructure}
          fetchFileContent={fetchFileContent}
          saveFile={saveFile}
        />
      </div>
    );
  }

  if (!sandboxReady) {
    return (
      <Placeholder
        title="Preparing sandbox"
        description="Setting up your workspace. This may take a minute or two."
      />
    );
  }

  if (!previewUrl) {
    return (
      <Placeholder
        title="Generating preview"
        description="Waiting for preview URL from sandbox…"
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center gap-8 overflow-auto p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="border-border bg-background relative h-[640px] w-[320px] overflow-hidden rounded-[40px] border-8 shadow-lg">
            <iframe
              src={previewUrl}
              className={cn(
                "h-full w-full border-0 transition-opacity duration-300",
                isIframeLoading ? "opacity-0" : "opacity-100",
              )}
              title="App Preview"
              onLoad={() => setIsIframeLoading(false)}
            />
            {isIframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2Icon className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-muted max-w-[260px] truncate rounded px-2 py-1 font-mono text-xs">
              {previewUrl}
            </code>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyUrl}>
              <CopyIcon className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {qrText && (
          <div className="flex max-w-sm flex-col gap-3">
            <div className="flex items-center gap-2">
              <SmartphoneIcon className="h-4 w-4" />
              <h3 className="text-sm font-semibold">Test on your phone</h3>
            </div>
            <p className="text-muted-foreground text-sm">
              Install{" "}
              <a
                href="https://expo.dev/go"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Expo Go
              </a>{" "}
              and scan this QR code.
            </p>
            <div className="bg-background flex items-center justify-center rounded-lg border p-4">
              <Canvas
                text={qrText}
                options={{
                  errorCorrectionLevel: "M",
                  margin: 0,
                  scale: 4,
                  width: 200,
                  color: { dark: "#000000", light: "#FFFFFF" },
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
