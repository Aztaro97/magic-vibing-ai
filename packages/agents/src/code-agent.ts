import { createAgent } from '@inngest/agent-kit';
import { openAIModel } from './models/open-ai-model';
import { CODE_AGENT_PROMPT } from './promps/code-agent-prompt';
import { createOrUpdateFileTool } from './tools/create-or-update-file';
import { readFilesTool } from './tools/read-files-tool';
import { terminalTool } from './tools/terminal-tool';
import { lastAssistantTextMessageContent } from './utils';


export const codeAgent = createAgent({
	name: 'code-agent',
	description: `Expert in coding agent `,
	system: CODE_AGENT_PROMPT,
	model: openAIModel,
	tools: [terminalTool, createOrUpdateFileTool, readFilesTool],
	lifecycle: {
		onResponse: async ({ network, result }) => {
			const lastAssistantTextMessage = lastAssistantTextMessageContent(result);

			if (lastAssistantTextMessage && network) {
				if (lastAssistantTextMessage.includes("<task_summary>")) {
					network.state.data.summary = lastAssistantTextMessage
				}
			}

			return result;
		}
	}
});


