import { sbx } from "@acme/e2b/config";
import { getSandbox } from "@acme/e2b/utils";
import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

export const createOrUpdateFileTool = createTool({
	name: "createOrUpdateFile",
	description: "Use this tool to create or update a file in sandbox",
	parameters: z.object({
		files: z.array(z.object({
			path: z.string(),
			content: z.string(),
		})),
	}),
	handler: async ({ files }, { step, network }) => {
		const sandboxId = sbx.sandboxId
		const newFiles = await step?.run("createOrUpdateFile", async () => {
			try {

				const updatedFiles = network.state.data.files || {};
				const sandbox = await getSandbox(sandboxId);

				for (const file of files) {
					await sandbox.files.write(file.path, file.content);
					updatedFiles[file.path] = file.content;
				}

				return updatedFiles;

			} catch (error) {
				return "Error: " + error;

			}
		})

		if (typeof newFiles === "object") {
			network.state.data.files = newFiles;
		}
		return newFiles;

	}
})