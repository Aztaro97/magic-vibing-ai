//
// SIMPLIFIED: No searchParams — just projectId.
// Pre-fetches both project and messages for the AgentPanel.

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import ProjectView from "~/components/projects/project-view";
import { getQueryClient, trpc } from "~/trpc/server";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function Page({ params }: Props) {
  const { projectId } = await params;
  const queryClient   = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.projects.getOne.queryOptions({ id: projectId })),
    queryClient.prefetchQuery(trpc.messages.getMany.queryOptions({ projectId })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ErrorBoundary fallback={<p>Something went wrong loading this project.</p>}>
        <Suspense fallback={null}>
          <ProjectView projectId={projectId} />
        </Suspense>
      </ErrorBoundary>
    </HydrationBoundary>
  );
}