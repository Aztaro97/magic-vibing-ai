import { ChatOllama } from "@langchain/ollama"


type TOllamaModel = "llama3.2:3b" | "gemma3" | "qwen3" | "kimi-k2.5"

export const ollamaModel = ({ modelName = "llama3.2:3b" }: { modelName?: TOllamaModel }) => {
	return new ChatOllama({
		model: modelName,
		temperature: 0,
		maxRetries: 2,
		baseUrl: "http://127.0.0.1:11434",
	})
}
