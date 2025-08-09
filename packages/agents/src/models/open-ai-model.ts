import { openai } from "@inngest/agent-kit";

import { env } from "../../env";

export const openAIModel = openai({
	model: "gpt-4o",
	apiKey: env.OPENAI_API_KEY,
});

export function createOpenAIModel(modelName: string) {
	return openai({
		model: modelName,
		apiKey: env.OPENAI_API_KEY,
	});
}
