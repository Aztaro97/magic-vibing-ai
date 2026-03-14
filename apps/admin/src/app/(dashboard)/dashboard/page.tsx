"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ArrowRightIcon, FolderOpenIcon, SparklesIcon } from "lucide-react";

import { useSession } from "@acme/auth/client";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";

import { useTRPC } from "~/trpc/react";

dayjs.extend(relativeTime);

const ProjectList = () => {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { data: projects, isLoading } = useQuery(
    trpc.projects.getMany.queryOptions(),
  );

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your AI-generated applications
          </p>
        </div>
        <Button
          asChild
          className="bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-medium text-white shadow-sm hover:from-amber-600 hover:to-orange-700"
        >
          <Link href="/">
            <SparklesIcon className="mr-1.5 h-3.5 w-3.5" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="bg-card animate-pulse rounded-xl border p-5"
            >
              <div className="flex items-start gap-3">
                <div className="bg-muted h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="bg-muted h-4 w-2/3 rounded" />
                  <div className="bg-muted h-3 w-1/3 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && projects?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-20">
          <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
            <FolderOpenIcon className="text-muted-foreground h-6 w-6" />
          </div>
          <h3 className="text-base font-medium">No projects yet</h3>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">
            Create your first project to get started
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <SparklesIcon className="mr-1.5 h-3.5 w-3.5" />
              Create Project
            </Link>
          </Button>
        </div>
      )}

      {/* Project grid */}
      {!isLoading && projects && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/project/${project.id}`}
              className={cn(
                "bg-card group relative flex flex-col rounded-xl border p-5 transition-all duration-200",
                "hover:border-amber-500/30 hover:shadow-md hover:shadow-amber-500/5",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <Image
                    src="/logo.svg"
                    alt=""
                    width={18}
                    height={18}
                    className="opacity-80"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium">
                    {project.name}
                  </h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {dayjs(project.updatedAt).fromNow()}
                  </p>
                </div>
                <ArrowRightIcon className="text-muted-foreground h-4 w-4 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              {project.model && (
                <div className="mt-3 flex items-center">
                  <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-medium">
                    {project.model}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;
