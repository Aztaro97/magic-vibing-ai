import { getSandbox } from "@acme/agents/utils";
import type {
	Message
} from "@inngest/agent-kit";
import {
	createState
} from "@inngest/agent-kit";
import { inngestClient } from "../client";

import { buildCodeAgent, buildCodingAgentNetwork, getDynamicModel } from "@acme/agents";
import { db, desc, eq, fragment, message, project } from "@acme/db";
import { createExpoSandbox } from "@acme/e2b/config";

interface AgentState {
	summary: string;
	files: Record<string, string>;
	sandboxId?: string;
}

export const codeAgentFn = inngestClient.createFunction(
	{ id: "code-agent" },
	{ event: "code-agent/run" },
	async ({ event, step }) => {
		const sandboxId = await step.run("create-expo-sandbox", async () => {
			const [proj] = await db
				.select()
				.from(project)
				.where(eq(project.id, event.data.projectId))
				.limit(1);

			const sandbox = await createExpoSandbox({ projectName: proj?.name ?? String(event.data.projectId) });
			return sandbox.sandboxId;
		});

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
				sandboxId: undefined,
			},
			{
				messages: previousMessage,
			}
		);



		// Make the created sandbox available to tools in the agent network
		state.data.sandboxId = sandboxId;

		// Choose model dynamically based on selected project model (from DB) or event
		const [proj] = await db
			.select()
			.from(project)
			.where(eq(project.id, event.data.projectId))
			.limit(1);

		const modelName = (event.data).model ?? proj?.model ?? "claude-3-5-sonnet-latest";

		const dynamicAgent = buildCodeAgent(getDynamicModel(modelName));
		const network = buildCodingAgentNetwork(dynamicAgent);
		const result = await network.run(event.data.value, { state });

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
