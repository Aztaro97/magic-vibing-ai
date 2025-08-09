import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { sbx } from "@acme/e2b/config";
import { getSandbox } from "@acme/e2b/utils";

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

			try {
				const targetSandboxId = (network as any)?.state?.data?.sandboxId ?? sbx.sandboxId;
				const sandbox = await getSandbox(targetSandboxId);

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
	},
});
