"use client";

import { Suspense, useState } from "react";
import { CodeIcon, EyeIcon } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";

import type { Fragment } from "@acme/db";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@acme/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@acme/ui/tabs";

import { ErrorNotificationContainer } from "../error-notification-container";
import MessageContainer from "../messages-container";
import { FileExplorer } from "./file-explorer";
import FragmentWeb from "./fragment-web";
import ProjectHeader from "./project-header";

interface Props {
  projectId: string;
}

function ProjectView({ projectId }: Props) {
  const [activeFragment, setActiveFragment] = useState<Fragment | null>(null);
  const [tabState, setTabState] = useState<"preview" | "code">("preview");

  return (
    <div className="h-screen">
      <ErrorNotificationContainer projectId={projectId} />
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={35}
          minSize={20}
          className="flex min-h-0 flex-col"
        >
          <ErrorBoundary fallback={<p>Project Header Error</p>}>
            <Suspense fallback={<p>loading header...</p>}>
              <ProjectHeader projectId={projectId} />
            </Suspense>
          </ErrorBoundary>
          <ErrorBoundary fallback={<p>Message Container Error</p>}>
            <Suspense fallback={<p>Loading Messages .....</p>}>
              <MessageContainer
                projectId={projectId}
                activeFragment={activeFragment}
                setActiveFragment={setActiveFragment}
              />
            </Suspense>
          </ErrorBoundary>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={65} minSize={50}>
          <Tabs
            className="h-full gap-y-0"
            defaultValue="preview"
            value={tabState}
            onValueChange={(value) => setTabState(value as "preview" | "code")}
          >
            <div className="flex w-full items-center gap-x-2 border-b p-2">
              <TabsList className="h-8 rounded-md border p-0">
                <TabsTrigger
                  value="preview"
                  className="cursor-pointer rounded-md"
                >
                  <EyeIcon /> <span>Preview</span>
                </TabsTrigger>
                <TabsTrigger value="code" className="cursor-pointer rounded-md">
                  <CodeIcon /> <span>Code</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="preview">
              {!!activeFragment && <FragmentWeb data={activeFragment} />}
            </TabsContent>
            <TabsContent value="code" className="min-h-0">
              {!!activeFragment?.files && (
                <FileExplorer
                  files={activeFragment.files as Record<string, string>}
                />
              )}
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default ProjectView;
