import { createAgent } from "@inngest/agent-kit";

import { LLM_MODELS } from "./constants";
import { anthropicModel, createAnthropicModel } from "./models/anthropic-model";
import { createOpenAIModel } from "./models/open-ai-model";
import { CODE_AGENT_PROMPT } from "./promps/code-agent-prompt";
import { createOrUpdateFileTool } from "./tools/create-or-update-file";
import { readFilesTool } from "./tools/read-files-tool";
import { terminalTool } from "./tools/terminal-tool";
import { lastAssistantTextMessageContent } from "./utils";

export const codeAgent = createAgent({
	name: "code-agent",
	description: `Expert in coding agent `,
	system: CODE_AGENT_PROMPT,
	model: anthropicModel,
	tools: [terminalTool, createOrUpdateFileTool, readFilesTool],
	lifecycle: {
		onResponse: async ({ network, result }) => {
			const lastAssistantTextMessage = lastAssistantTextMessageContent(result);

			if (lastAssistantTextMessage && network) {
				if (lastAssistantTextMessage.includes("<task_summary>")) {
					network.state.data.summary = lastAssistantTextMessage;
				}
			}

			return result;
		},
	},
});

export function getDynamicModel(modelName: string) {
	const model = LLM_MODELS.find((m) => m.models.includes(modelName));
	switch (model?.provider) {
		case "openai":
			return createOpenAIModel(modelName);

		case "anthropic":
			return createAnthropicModel(modelName);

		default:
			throw new Error(`Unsupported LLM provider: ${model?.provider}`);
	}
	// default to anthropic if unknown
	return createAnthropicModel(modelName);
}

export function buildCodeAgent(model: ReturnType<typeof createAnthropicModel> | ReturnType<typeof createOpenAIModel>) {
	return createAgent({
		name: "code-agent",
		description: `Expert in coding agent `,
		system: CODE_AGENT_PROMPT,
		model,
		tools: [terminalTool, createOrUpdateFileTool, readFilesTool],
		lifecycle: {
			onResponse: async ({ network, result }) => {
				const lastAssistantTextMessage = lastAssistantTextMessageContent(result);
				if (lastAssistantTextMessage && network) {
					if (lastAssistantTextMessage.includes("<task_summary>")) {
						network.state.data.summary = lastAssistantTextMessage;
					}
				}
				return result;
			},
		},
	});
}
