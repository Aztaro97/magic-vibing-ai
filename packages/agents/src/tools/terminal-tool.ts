import { getSandbox } from "@acme/e2b/utils";
import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { sbx } from "@acme/e2b/config";
export const terminalTool = createTool({
	name: "terminal",
	description: "Use this tool to run terminal commands",
	parameters: z.object({
		command: z.string(),
	}),
	handler: async ({ command }, { step }) => {
		return await step?.run("terminal", async () => {
			const buffers = {
				stdout: "",
				stderr: "",
			}

			try {
				const sandbox = await getSandbox(sbx.sandboxId);

				const result = await sandbox.commands.run(command, {
					onStdout: (data) => {
						buffers.stdout += data;
					},
					onStderr: (data) => {
						buffers.stderr += data;
					},

				});

				return result.stdout;
			} catch (error) {
				const errorMessage = `Command failed: ${error} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
				console.error(errorMessage);
				return errorMessage;
			}

		});

	}
})