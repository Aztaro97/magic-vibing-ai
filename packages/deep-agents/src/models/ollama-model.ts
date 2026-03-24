import { ChatOllama } from "@langchain/ollama"


type TOllamaModel = "GLM-5" | "Kimi-K2.5" | "MiniMax-M2.5" | "qwen3.5-397B-A17B" | "devstral-2-123B"

export const ollamaModel = ({ modelName = "Kimi-K2.5" }: { modelName?: TOllamaModel }) => {
	return new ChatOllama({
		model: modelName,
		temperature: 0,
		maxRetries: 2,
		baseUrl: "http://127.0.0.1:11434",
	})
}
