"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { useSession } from "@acme/auth/client";
import { Button } from "@acme/ui";

import { useTRPC } from "~/trpc/react";

const ProjectList = () => {
  dayjs.extend(relativeTime);
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { data: projects } = useQuery(trpc.projects.getMany.queryOptions());

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-y-6">
      <h2 className="text-2xl font-semibold">Recent Projects</h2>
      <div>
        {projects?.length === 0 ? (
          <div className="col-span-full text-center">
            <p className="text-muted-foreground text-sm">No Projects Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {projects?.map((project) => (
              <div key={project.id}>
                <Button
                  asChild
                  variant="outline"
                  className="h-auto w-full justify-start p-4 text-start font-normal"
                >
                  <Link href={`/project/${project.id}`}>
                    <div className="flex items-center gap-x-4">
                      <Image
                        src="/logo.svg"
                        alt="vibe"
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                      <div className="flex flex-col">
                        <h3 className="truncate font-medium">{project.name}</h3>
                        <p className="text-muted-foreground text-sm">
                          {dayjs(project.updatedAt).fromNow()}
                        </p>
                      </div>
                    </div>
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList;
