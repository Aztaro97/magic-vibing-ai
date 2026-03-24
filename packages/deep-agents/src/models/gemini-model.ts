import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "../../env";



type TGoogleModel = "gemini-3-flash-preview" | "gemini-3.1-pro-preview"

export const googleGeminiModel = ({ modelName = "gemini-3.1-pro-preview" }: { modelName?: TGoogleModel }) => {
	if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
	return new ChatGoogleGenerativeAI({
		model: modelName,
		temperature: 0,
		maxRetries: 2,
		apiKey: env.GEMINI_API_KEY,
	})
}
