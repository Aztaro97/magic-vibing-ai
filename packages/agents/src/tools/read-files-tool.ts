import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { getSandbox } from "@acme/e2b/utils";

export const readFilesTool = createTool({
	name: "readFiles",
	description: "Use this tool to read files from sandbox",
	parameters: z.object({
		files: z.array(z.string()),
	}),
	handler: async ({ files }, { step, network }) => {
		return await step?.run("readFiles", async () => {
			try {
				const targetSandboxId = (network as any)?.state?.data?.sandboxId;
				if (!targetSandboxId) {
					return "Error: No sandbox available. The development environment may not be ready yet.";
				}
				const sandbox = await getSandbox(targetSandboxId);
				const contents = [];
				for (const file of files) {
					const content = await sandbox.files.read(file);
					contents.push({
						path: file,
						content,
					});
				}
				return JSON.stringify(contents);
			} catch (error) {
				return "Error: " + (error instanceof Error ? error.message : error);
			}
		});
	},
});
