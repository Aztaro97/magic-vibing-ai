// Legacy Inngest tool - to be removed after migration
import { createTool } from "@inngest/agent-kit";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { getSandbox } from "@acme/e2b/utils";
import { detectAndNotifyRuntimeError } from "@acme/error-handler/server";

/**
 * Creates a terminal tool for LangGraph agents
 * Executes commands in the E2B sandbox
 */
export function createTerminalTool(sandboxId: string, projectId?: string) {
  return tool(
    async ({ command }) => {
      const buffers = {
        stdout: "",
        stderr: "",
      };

      try {
        const sandbox = await getSandbox(sandboxId);

        const result = await sandbox.commands.run(command, {
          onStdout: (data) => {
            buffers.stdout += data;
            if (projectId) {
              detectAndNotifyRuntimeError(data, projectId);
            }
          },
          onStderr: (data) => {
            buffers.stderr += data;
            if (projectId) {
              detectAndNotifyRuntimeError(data, projectId);
            }
          },
        });

        return result.stdout;
      } catch (error) {
        const errorMessage = `Command failed: ${error instanceof Error ? error.message : error} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
        console.error(errorMessage);
        if (projectId) {
          detectAndNotifyRuntimeError(errorMessage, projectId);
        }
        return errorMessage;
      }
    },
    {
      name: "terminal",
      description:
        "Use this tool to run terminal commands in the sandbox environment. Use 'npx expo install <package>' for Expo packages or 'npm install <package> --yes' for other packages.",
      schema: z.object({
        command: z.string().describe("The terminal command to execute"),
      }),
    },
  );
}

export const terminalTool = createTool({
  name: "terminal",
  description: "Use this tool to run terminal commands",
  parameters: z.object({
    command: z.string(),
  }),
  handler: async ({ command }, { step, network }) => {
    return await step?.run("terminal", async () => {
      const buffers = {
        stdout: "",
        stderr: "",
      };

      const projectId = (network as any)?.state?.data?.projectId as
        | string
        | undefined;

      try {
        const targetSandboxId = (network as any)?.state?.data?.sandboxId;
        if (!targetSandboxId) {
          return "Error: No sandbox available. The development environment may not be ready yet.";
        }
        const sandbox = await getSandbox(targetSandboxId);

        const result = await sandbox.commands.run(command, {
          onStdout: (data) => {
            buffers.stdout += data;
            detectAndNotifyRuntimeError(data, projectId);
          },
          onStderr: (data) => {
            buffers.stderr += data;
            detectAndNotifyRuntimeError(data, projectId);
          },
        });

        return result.stdout;
      } catch (error) {
        const errorMessage = `Command failed: ${error instanceof Error ? error.message : error} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
        console.error(errorMessage);
        detectAndNotifyRuntimeError(errorMessage, projectId);
        return errorMessage;
      }
    });
  },
});
