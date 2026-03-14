import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { getSandbox } from "@acme/e2b/utils";
import { detectAndNotifyRuntimeError } from "@acme/error-handler/server";

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

			const projectId = (network as any)?.state?.data?.projectId as string | undefined;

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
