import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import ProjectView from "~/components/projects/project-view";
import { getQueryClient, trpc } from "~/trpc/server";

interface Props {
  params:      Promise<{ projectId: string }>;
  searchParams: Promise<{ prompt?: string; model?: string }>;
}

export default async function Page({ params, searchParams }: Props) {
  const { projectId }           = await params;
  const { prompt, model }       = await searchParams;

  const queryClient = getQueryClient();

  // Pre-fetch project and messages in parallel on the server
  void queryClient.prefetchQuery(
    trpc.projects.getOne.queryOptions({ id: projectId }),
  );
  void queryClient.prefetchQuery(
    trpc.messages.getMany.queryOptions({ projectId }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ErrorBoundary fallback={<p>Something went wrong loading this project.</p>}>
        <Suspense fallback={null}>
          <ProjectView
            projectId={projectId}
            initialPrompt={prompt}
            initialModel={model}
          />
        </Suspense>
      </ErrorBoundary>
    </HydrationBoundary>
  );
}