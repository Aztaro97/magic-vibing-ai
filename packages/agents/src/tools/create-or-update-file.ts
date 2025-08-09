import { createTool } from "@inngest/agent-kit";
import { z } from "zod";

import { sbx } from "@acme/e2b/config";
import { getSandbox } from "@acme/e2b/utils";

function normalizeRelativePath(inputPath: string): string {
	let p = inputPath.trim();
	p = p.replace(/^~\//, "");
	p = p.replace(/^\/home\/user\//, "");
	p = p.replace(/^\/+/, "");
	return p;
}

const FileItemSchema = z.object({
	path: z.string().min(1, "path is required"),
	content: z.string(),
});
type FileItem = z.infer<typeof FileItemSchema>;

export const createOrUpdateFileTool = createTool({
	name: "createOrUpdateFile",
	description:
		"Create or update one or more files in the sandbox. Paths must be relative (e.g. 'app/(tabs)/index.tsx').",
	parameters: z.object({
		files: z.array(z.object({ path: z.string().min(1), content: z.string() })).optional(),
		path: z.string().optional(),
		content: z.string().optional(),
	}),
	handler: async (input: unknown, { step, network }) => {
		const params = z
			.object({
				files: z.array(FileItemSchema).optional(),
				path: z.string().optional(),
				content: z.string().optional(),
			})
			.parse(input);
		const sandboxId = (network as any)?.state?.data?.sandboxId ?? sbx.sandboxId;
		const files: FileItem[] = (params.files?.length)
			? params.files
			: (params.path && typeof params.content === "string")
				? [{ path: params.path, content: params.content }]
				: [];

		const prepared: FileItem[] = files
			.filter((f) => Boolean(f?.path))
			.map((f) => ({ path: normalizeRelativePath(f.path), content: f.content }));

		if (prepared.length === 0) {
			return "Error: Path or files are required";
		}

		const result = await step?.run("createOrUpdateFile", async () => {
			try {
				const updatedFiles: Record<string, string> = (network as any).state.data.files ?? {};
				const sandbox = await getSandbox(sandboxId);

				for (const file of prepared) {
					if (!file.path) {
						throw new Error("Path is required for each file");
					}
					await sandbox.files.write(file.path, file.content);
					updatedFiles[file.path] = file.content;
				}

				return updatedFiles;
			} catch (error) {
				return "Error: " + (error as Error).message;
			}
		});

		if (typeof result === "object" && result !== null) {
			(network as any).state.data.files = result as Record<string, string>;
		}
		return result;
	},
});
