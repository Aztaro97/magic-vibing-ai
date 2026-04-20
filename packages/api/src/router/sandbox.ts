import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { and, db, eq, project } from "@acme/db";
import { connectSandbox } from "@acme/sandboxes/libs";

import { protectedProcedure } from "../trpc";

const APP_ROOT = "/home/user/app";
const FILE_EXTENSIONS = [
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "md",
  "py",
  "html",
  "css",
  "txt",
] as const;

const EXCLUDED_PATH_FRAGMENTS = [
  "node_modules",
  ".git/",
  "features/element-edition",
  "features/floating-chat",
  "contexts/AuthContext.tsx",
] as const;

export interface SandboxFileItem {
  name: string;
  type: string;
  path: string;
  size: string;
}

export interface BulkFile {
  path: string;
  content: string;
  size: number;
  lastModified: number;
}

function buildFindCommand(limit: number): string {
  const nameFilters = FILE_EXTENSIONS.map((ext) => `-name "*.${ext}"`).join(
    " -o ",
  );
  const excludes = EXCLUDED_PATH_FRAGMENTS.map(
    (fragment) => `| grep -v "${fragment}"`,
  ).join(" ");

  return `find ${APP_ROOT} -type f \\( ${nameFilters} \\) ${excludes} | head -${limit} | sort`;
}

function normalizePath(fullPath: string): string {
  return fullPath.replace(`${APP_ROOT}/`, "").replace(/^\.\//, "");
}

function sanitizeRelativePath(relativePath: string): string {
  const trimmed = relativePath.replace(/^\/+/, "").replace(/^\.\//, "");
  if (trimmed.includes("..")) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid file path",
    });
  }
  return trimmed;
}

async function getProjectSandboxId(
  projectId: string,
  userId: string,
): Promise<string> {
  const [existingProject] = await db
    .select({ sandboxId: project.sandboxId })
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.userId, userId)))
    .limit(1);

  if (!existingProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  if (!existingProject.sandboxId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Project has no active sandbox",
    });
  }

  return existingProject.sandboxId;
}

async function connectToProjectSandbox(sandboxId: string) {
  try {
    const sandbox = await connectSandbox(sandboxId);
    if (!sandbox) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Sandbox is no longer available",
      });
    }
    return sandbox;
  } catch (error: unknown) {
    if (error instanceof TRPCError) throw error;

    const message = error instanceof Error ? error.message : String(error);
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? (error as { status?: number }).status
        : undefined;

    if (message.includes("not found") || status === 404) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Sandbox not found or expired",
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to connect to sandbox: ${message}`,
    });
  }
}

export const sandboxRouter = {
  getStructure: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(
      async ({ input, ctx }): Promise<{ structure: SandboxFileItem[] }> => {
        const sandboxId = await getProjectSandboxId(
          input.projectId,
          ctx.session.user.id,
        );
        const sandbox = await connectToProjectSandbox(sandboxId);

        const result = await sandbox.commands.run(buildFindCommand(200), {
          timeoutMs: 60_000,
        });

        if (result.exitCode !== 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Structure command failed: ${result.stderr}`,
          });
        }

        const structure: SandboxFileItem[] = result.stdout
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((fullPath) => {
            const relativePath = normalizePath(fullPath);
            const fileName = relativePath.split("/").pop() ?? relativePath;
            const extension = fileName.includes(".")
              ? (fileName.split(".").pop() ?? "file")
              : "file";

            return {
              name: fileName,
              type: extension,
              path: relativePath,
              size: "1kb",
            };
          });

        return { structure };
      },
    ),

  getFile: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        filePath: z.string().min(1),
      }),
    )
    .query(
      async ({ input, ctx }): Promise<{ content: string; path: string }> => {
        const relativePath = sanitizeRelativePath(input.filePath);
        const sandboxId = await getProjectSandboxId(
          input.projectId,
          ctx.session.user.id,
        );
        const sandbox = await connectToProjectSandbox(sandboxId);

        const fullPath = `${APP_ROOT}/${relativePath}`;

        try {
          const content = await sandbox.files.read(fullPath);
          return { content: content ?? "", path: relativePath };
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (message.toLowerCase().includes("not found")) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `File not found: ${relativePath}`,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to read file: ${message}`,
          });
        }
      },
    ),

  getBulkFiles: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ input, ctx }): Promise<{ files: BulkFile[] }> => {
      const sandboxId = await getProjectSandboxId(
        input.projectId,
        ctx.session.user.id,
      );
      const sandbox = await connectToProjectSandbox(sandboxId);

      const listResult = await sandbox.commands.run(buildFindCommand(100), {
        timeoutMs: 30_000,
      });

      if (listResult.exitCode !== 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to list files: ${listResult.stderr}`,
        });
      }

      const relativePaths = listResult.stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map(normalizePath);

      if (relativePaths.length === 0) {
        return { files: [] };
      }

      const batchSize = 10;
      const files: BulkFile[] = [];

      for (let i = 0; i < relativePaths.length; i += batchSize) {
        const batch = relativePaths.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (relativePath): Promise<BulkFile | null> => {
            const fullPath = `${APP_ROOT}/${relativePath}`;
            try {
              const content = await sandbox.files.read(fullPath);
              return {
                path: relativePath,
                content: content ?? "",
                size: (content ?? "").length,
                lastModified: Date.now(),
              };
            } catch {
              return null;
            }
          }),
        );

        for (const file of batchResults) {
          if (file) files.push(file);
        }
      }

      return { files };
    }),

  editFile: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        filePath: z.string().min(1),
        content: z.string(),
      }),
    )
    .mutation(
      async ({ input, ctx }): Promise<{ success: true; path: string }> => {
        const relativePath = sanitizeRelativePath(input.filePath);
        const sandboxId = await getProjectSandboxId(
          input.projectId,
          ctx.session.user.id,
        );
        const sandbox = await connectToProjectSandbox(sandboxId);

        const fullPath = `${APP_ROOT}/${relativePath}`;

        try {
          await sandbox.files.write(fullPath, input.content);
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to write file: ${message}`,
          });
        }

        return { success: true, path: relativePath };
      },
    ),
} satisfies TRPCRouterRecord;
