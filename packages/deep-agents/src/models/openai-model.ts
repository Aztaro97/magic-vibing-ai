import { ChatOpenAI, OpenAIChatModelId } from "@langchain/openai";



//  Deep Agent model support : gpt-5.4, gpt-4o, gpt-4.1, o4-mini, gpt-5.2-codex, gpt-4o-mini, o3
export const openaiModel = ({ modelName = "gpt-5.4" }: { modelName?: OpenAIChatModelId }) => {
	return new ChatOpenAI({
		model: modelName,
		temperature: 0,
		streaming: true,
		maxTokens: 8192,
		openAIApiKey: process.env.OPENAI_API_KEY,
	});
}
