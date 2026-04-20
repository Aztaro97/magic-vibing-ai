"use client";

import { Suspense, useState } from "react";
import { CodeIcon, EyeIcon, Loader2Icon } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import type { Fragment } from "@acme/db";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@acme/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@acme/ui/tabs";

import AgentPanel from "~/components/agent-panel";
import { ErrorNotificationContainer } from "../error-notification-container";
import { PreviewPanel } from "./preview-panel";
import ProjectHeader from "./project-header";

interface Props {
  projectId: string;
}

type TabValue = "preview" | "code";

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
  const [tabState, setTabState] = useState<TabValue>("preview");

  return (
    <div className="h-screen">
      <ErrorNotificationContainer projectId={projectId} />
      <ResizablePanelGroup direction="horizontal">
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
              <ErrorFallback error={error} label="chat" />
            )}
          >
            <Suspense fallback={<LoadingSkeleton label="Loading messages…" />}>
              {/*
                sessionId = projectId:
                  - One project = one LangGraph thread = one conversation history
                  - Stable across page reloads (no random UUIDs)
                  - thread_id inside useStream will be this value
              */}
              <AgentPanel
                projectId={projectId}
                sessionId={projectId}
                activeFragment={activeFragment}
                setActiveFragment={setActiveFragment}
              />
            </Suspense>
          </ErrorBoundary>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={65} minSize={30}>
          <Tabs
            value={tabState}
            onValueChange={(v) => setTabState(v as TabValue)}
            className="flex h-full flex-col"
          >
            <div className="flex items-center justify-between border-b px-3 py-1.5">
              <TabsList className="h-7">
                <TabsTrigger value="preview" className="h-6 gap-1.5 text-xs">
                  <EyeIcon className="h-3.5 w-3.5" /> Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="h-6 gap-1.5 text-xs">
                  <CodeIcon className="h-3.5 w-3.5" /> Code
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="preview" className="mt-0 flex-1 overflow-hidden">
              <ErrorBoundary
                fallbackRender={({ error }) => (
                  <ErrorFallback error={error} label="preview" />
                )}
              >
                <Suspense fallback={<LoadingSkeleton label="Loading preview…" />}>
                  <PreviewPanel projectId={projectId} mode="preview" />
                </Suspense>
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="code" className="mt-0 flex-1 overflow-hidden">
              <ErrorBoundary
                fallbackRender={({ error }) => (
                  <ErrorFallback error={error} label="file explorer" />
                )}
              >
                <Suspense fallback={<LoadingSkeleton label="Loading files…" />}>
                  <PreviewPanel projectId={projectId} mode="code" />
                </Suspense>
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default ProjectView;
