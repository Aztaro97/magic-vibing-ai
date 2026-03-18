"use client";

import { CodeIcon, EyeIcon, Loader2Icon } from "lucide-react";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import type { Fragment } from "@acme/db";
import { cn } from "@acme/ui";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@acme/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@acme/ui/tabs";

import { useSession } from "@acme/auth/client";
import AgentPanel from "~/components/agent-panel";
import { ErrorNotificationContainer } from "../error-notification-container";
import { FileExplorer } from "./file-explorer";
import FragmentWeb from "./fragment-web";
import ProjectHeader from "./project-header";

interface Props {
  projectId: string;
}

function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2Icon className="text-muted-foreground h-4 w-4 animate-spin" />
        <span className="text-muted-foreground text-sm">{label}</span>
      </div>
    </div>
  );
}

function ErrorFallback({ error, label }: { error?: Error; label: string }) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="text-center">
        <p className="text-destructive text-sm font-medium">
          Failed to load {label}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {error?.message ?? "An unexpected error occurred"}
        </p>
      </div>
    </div>
  );
}

function ProjectView({ projectId }: Props) {
  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
  const [tabState, setTabState] = useState<"preview" | "code">("preview");
  const { data: session } = useSession();

  return (
    <div className="h-screen">
      <ErrorNotificationContainer projectId={projectId} />
      <ResizablePanelGroup direction="horizontal">
        {/* Chat Panel */}
        <ResizablePanel
          defaultSize={35}
          minSize={25}
          className="flex min-h-0 flex-col"
        >
          <ErrorBoundary
            fallbackRender={({ error }) => (
              <ErrorFallback error={error} label="project header" />
            )}
          >
            <Suspense
              fallback={
                <div className="flex items-center gap-2 border-b px-3 py-2">
                  <div className="bg-muted h-4 w-4 animate-pulse rounded" />
                  <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                </div>
              }
            >
              <ProjectHeader projectId={projectId} />
            </Suspense>
          </ErrorBoundary>
          <ErrorBoundary
            fallbackRender={({ error }) => (
              <ErrorFallback error={error} label="messages" />
            )}
          >
            <Suspense
              fallback={<LoadingSkeleton label="Loading messages..." />}
            >
              {/* <MessageContainer
                projectId={projectId}
                activeFragment={activeFragment}
                setActiveFragment={setActiveFragment}
              /> */}
			  <AgentPanel projectId={projectId} sessionId={session?.user.id ?? ""} activeFragment={activeFragment} setActiveFragment={setActiveFragment} />
            </Suspense>
          </ErrorBoundary>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Preview/Code Panel */}
        <ResizablePanel defaultSize={65} minSize={50}>
          <Tabs
            className="flex h-full flex-col gap-y-0"
            defaultValue="preview"
            value={tabState}
            onValueChange={(value) => setTabState(value as "preview" | "code")}
          >
            <div className="bg-card/50 flex w-full items-center gap-x-2 border-b px-3 py-2 backdrop-blur-sm">
              <TabsList className="h-8 rounded-lg border bg-transparent p-0.5">
                <TabsTrigger
                  value="preview"
                  className={cn(
                    "cursor-pointer gap-1.5 rounded-md px-3 text-xs",
                    "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                  )}
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  Preview
                </TabsTrigger>
                <TabsTrigger
                  value="code"
                  className={cn(
                    "cursor-pointer gap-1.5 rounded-md px-3 text-xs",
                    "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                  )}
                >
                  <CodeIcon className="h-3.5 w-3.5" />
                  Code
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="preview" className="flex-1">
              {activeFragment ? (
                <FragmentWeb data={activeFragment} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-xl">
                    <EyeIcon className="text-muted-foreground h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">
                      No preview available
                    </p>
                    <p className="text-muted-foreground/60 mt-0.5 text-xs">
                      Send a message to generate your first build
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="code" className="min-h-0 flex-1">
              {activeFragment?.files ? (
                <FileExplorer
                  files={activeFragment.files as Record<string, string>}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-xl">
                    <CodeIcon className="text-muted-foreground h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm">
                      No code to display
                    </p>
                    <p className="text-muted-foreground/60 mt-0.5 text-xs">
                      Generated code will appear here
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default ProjectView;
