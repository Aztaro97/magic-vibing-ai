import { ChatMoonshot } from "@langchain/community/chat_models/moonshot";
import { env } from "../../env";



type TMoonshotModel = "moonshot-v1-8k" | "kimi-k2.5"

export const moonshotModel = ({ modelName = "kimi-k2.5" }: { modelName?: TMoonshotModel }) => {
	if (!env.MOONSHOT_API_KEY) throw new Error("MOONSHOT_API_KEY is not set");
	return new ChatMoonshot({
		model: modelName,
		temperature: 0,
		maxRetries: 2,
		apiKey: env.MOONSHOT_API_KEY,
	})
}
