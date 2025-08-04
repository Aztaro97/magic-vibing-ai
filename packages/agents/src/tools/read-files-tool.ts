import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { sbx } from "@acme/e2b/config";
import { getSandbox } from "@acme/e2b/utils";

export const readFilesTool = createTool({
  name: "readFiles",
  description: "Use this tool to read files from sandbox",
  parameters: z.object({
    files: z.array(z.string()),
  }),
  handler: async ({ files }, { step }) => {
    return await step?.run("readFiles", async () => {
      try {
        const sandbox = await getSandbox(sbx.sandboxId);
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
        return "Error: " + error;
      }
    });
  },
});
