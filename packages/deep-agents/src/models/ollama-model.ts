import { ChatOllama } from "@langchain/ollama"


type TOllamaModel = "qwen3.5" | "kimi-k2.5"

export const ollamaModel = ({ modelName = "qwen3.5" }: { modelName?: TOllamaModel }) => {
	return new ChatOllama({
		model: modelName,
		temperature: 0,
		maxRetries: 2,
		baseUrl: "http://127.0.0.1:11434",
	})
}
