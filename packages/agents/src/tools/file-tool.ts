import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { getSandbox } from "@acme/e2b/utils";

/**
 * Creates a file operation tool for LangGraph agents
 * Supports creating or updating files in the E2B sandbox
 */
export function createFileTool(sandboxId: string) {
  return tool(
    async ({ files }) => {
      try {
        const sandbox = await getSandbox(sandboxId);
        const results: Array<{
          path: string;
          success: boolean;
          error?: string;
        }> = [];

        for (const file of files) {
          try {
            // Write file to sandbox
            await sandbox.files.write(file.path, file.content);
            results.push({ path: file.path, success: true });
          } catch (error) {
            results.push({
              path: file.path,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
          return {
            success: false,
            message: `Failed to write ${failed.length} file(s): ${failed.map((f) => `${f.path}: ${f.error}`).join(", ")}`,
            results,
          };
        }

        return {
          success: true,
          message: `Successfully wrote ${results.length} file(s)`,
          results,
        };
      } catch (error) {
        return {
          success: false,
          message: `File operation failed: ${error instanceof Error ? error.message : String(error)}`,
          results: [],
        };
      }
    },
    {
      name: "createOrUpdateFile",
      description:
        "Create or update files in the sandbox environment. Supports multiple files at once. Use relative paths like 'app/(tabs)/index.tsx' or 'components/Button.tsx'. NEVER use absolute paths like '/home/user/...'.",
      schema: z.object({
        files: z
          .array(
            z.object({
              path: z
                .string()
                .describe("Relative file path (e.g., 'app/(tabs)/index.tsx')"),
              content: z.string().describe("File content to write"),
            }),
          )
          .describe("Array of files to create or update"),
      }),
    },
  );
}

/**
 * Creates a file read tool for LangGraph agents
 * Supports reading files from the E2B sandbox
 */
export function createReadFileTool(sandboxId: string) {
  return tool(
    async ({ paths }) => {
      try {
        const sandbox = await getSandbox(sandboxId);
        const results: Array<{
          path: string;
          content?: string;
          error?: string;
        }> = [];

        for (const path of paths) {
          try {
            const content = await sandbox.files.read(path);
            results.push({ path, content });
          } catch (error) {
            results.push({
              path,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        return {
          success: true,
          files: results,
        };
      } catch (error) {
        return {
          success: false,
          error: `File read failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    {
      name: "readFiles",
      description:
        "Read files from the sandbox environment. Use relative paths like 'app/(tabs)/index.tsx'. Returns file contents.",
      schema: z.object({
        paths: z
          .array(z.string())
          .describe("Array of relative file paths to read"),
      }),
    },
  );
}
