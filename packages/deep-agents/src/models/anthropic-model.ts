import { AnthropicMessagesModelId, ChatAnthropic } from "@langchain/anthropic";


export const anthropicModel = ({ modelName = "claude-sonnet-4-6" }: { modelName?: AnthropicMessagesModelId }) => {
	return new ChatAnthropic({
		model: modelName,
		temperature: 0,
		streaming: true,
		maxTokens: 8192,
		anthropicApiKey: process.env.ANTHROPIC_API_KEY,
	});
}
