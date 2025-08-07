import { getSandbox } from "@acme/agents/utils";
import type {
	Message
} from "@inngest/agent-kit";
import {
	createState
} from "@inngest/agent-kit";
import { inngestClient } from "../client";

import { codingAgentNetwork } from "@acme/agents";
import { db, desc, eq, fragment, message } from "@acme/db";
import { sbx } from "@acme/e2b/config";

interface AgentState {
	summary: string;
	files: Record<string, string>;
}

export const codeAgentFn = inngestClient.createFunction(
	{ id: "code-agent" },
	{ event: "code-agent/run" },
	async ({ event, step }) => {
		const sandboxId = sbx.sandboxId;

		const previousMessage = await step.run("get-previous-message", async () => {
			const formattedMessages: Message[] = [];
			const messages = await db
				.select()
				.from(message)
				.where(eq(message.projectId, event.data.projectId))
				.orderBy(desc(message.createdAt))
				.limit(5);

			for (const msg of messages) {
				formattedMessages.push({
					type: "text",
					role: msg.role === "ASSISTANT" ? "assistant" : "user",
					content: msg.content,
				});
			}
			return formattedMessages.reverse();
		});

		const state = createState<AgentState>(
			{
				summary: "",
				files: {},
			},
			{
				messages: previousMessage,
			}
		);


		// const codeAgent = createAgent<AgentState>({
		// 	name: "code-agent",
		// 	description: "An Expert coding agent",
		// 	system: PROMPT,
		// 	model: getLLMModel(event.data.llm, event.data.apiKey, event.data.model),
		// 	tools: [
		// 		createTool({
		// 			name: "terminal",
		// 			description: "use terminal to run the commands",
		// 			parameters: z.object({
		// 				command: z.string(),
		// 			}),
		// 			handler: async ({ command }, { step }) => {
		// 				return await step?.run("terminal", async () => {
		// 					const buffers = { stdout: "", stderr: "" };

		// 					try {
		// 						const sandbox = await getSandbox(sandboxId);
		// 						const result = await sandbox.commands.run(command, {
		// 							onStdout: (data: string) => {
		// 								buffers.stdout += data;
		// 							},
		// 							onStderr: (data: string) => {
		// 								buffers.stderr += data;
		// 							},
		// 						});
		// 						return result.stdout;
		// 					} catch (error) {
		// 						console.log(
		// 							`Command Failed: ${error} \n stdout: ${buffers.stdout} \n stderror: ${buffers.stderr}`
		// 						);
		// 						return `Command Failed: ${error} \n stdout: ${buffers.stdout} \n stderror: ${buffers.stderr}`;
		// 					}
		// 				});
		// 			},
		// 		}),
		// 		createTool({
		// 			name: "createOrUploadFiles",
		// 			description: "Create or Update files in the sandbox",
		// 			parameters: z.object({
		// 				files: z.array(
		// 					z.object({
		// 						path: z.string(),
		// 						content: z.string(),
		// 					})
		// 				),
		// 			}),
		// 			handler: async (
		// 				{ files },
		// 				{ step, network }: Tool.Options<AgentState>
		// 			) => {
		// 				const newFiles = await step?.run(
		// 					"createOrUploadFiles",
		// 					async () => {
		// 						try {
		// 							const updatedFiles = network.state.data.files || {};
		// 							const sandbox = await getSandbox(sandboxId);
		// 							for (const file of files) {
		// 								await sandbox.files.write(file.path, file.content);
		// 								updatedFiles[file.path] = file.content;
		// 							}

		// 							return updatedFiles;
		// 						} catch (error) {
		// 							return "Error: " + error;
		// 						}
		// 					}
		// 				);
		// 				if (typeof newFiles === "object") {
		// 					network.state.data.files = newFiles;
		// 				}
		// 			},
		// 		}),
		// 		createTool({
		// 			name: "readFiles",
		// 			description: "Read files from the sandbox",
		// 			parameters: z.object({
		// 				files: z.array(z.string()),
		// 			}),
		// 			handler: async ({ files }, { step }) => {
		// 				return await step?.run("readFiles", async () => {
		// 					try {
		// 						const sandbox = await getSandbox(sandboxId);
		// 						const contents = [];
		// 						for (const file of files) {
		// 							const content = await sandbox.files.read(file);
		// 							contents.push({ path: file, content });
		// 						}

		// 						return JSON.stringify(contents);
		// 					} catch (error) {
		// 						return "Error: " + error;
		// 					}
		// 				});
		// 			},
		// 		}),
		// 	],

		// 	lifecycle: {
		// 		onResponse: async ({ result, network }) => {
		// 			const lastAssistantTextMessageText =
		// 				lastAssistantTextMessageContent(result);

		// 			if (lastAssistantTextMessageText && network) {
		// 				if (lastAssistantTextMessageText.includes("<task_summary>")) {
		// 					network.state.data.summary = lastAssistantTextMessageText;
		// 				}
		// 			}

		// 			return result;
		// 		},
		// 	},
		// });



		// const network = createNetwork<AgentState>({
		// 	name: "coding-agent-network",
		// 	agents: [codeAgent],
		// 	maxIter: 5,
		// 	defaultState: state,
		// 	router: async ({ network }) => {
		// 		const summary = network.state.data.summary;
		// 		if (summary) {
		// 			return;
		// 		}

		// 		return codeAgent;
		// 	},
		// });



		const result = await codingAgentNetwork.run(event.data.value, { state });

		const isError =
			!result.state.data.summary ||
			Object.keys(result.state.data.files || {}).length === 0;

		const sandboxUrl = await step.run("get-sandbox-url", async () => {
			const sandbox = await getSandbox(sandboxId);
			const host = sandbox.getHost(8081);
			return `https://${host}`;
		});


		await step.run("save-result", async () => {
			if (isError) {
				return await db.insert(message).values({
					projectId: event.data.projectId,
					content: "Something went Wrong. Please try again",
					role: "ASSISTANT",
					type: "ERROR",
				});
			}

			// Create message and fragment in a transaction
			return await db.transaction(async (tx) => {
				// First create the message
				const [createdMessage] = await tx
					.insert(message)
					.values({
						projectId: event.data.projectId,
						content: result.state.data.summary,
						role: "ASSISTANT",
						type: "RESULT",
					})
					.returning();

				if (!createdMessage) {
					throw new Error("Failed to create message");
				}

				// Then create the fragment linked to the message
				await tx.insert(fragment).values({
					messageId: createdMessage.id,
					sandboxUrl: sandboxUrl,
					title: "Fragment",
					files: result.state.data.files,
				});

				return createdMessage;
			});
		});

		return {
			url: sandboxUrl,
			title: "Fragments",
			files: result.state.data.files,
			summary: result.state.data.summary,
		};
	}
);
