import { anthropic } from "@inngest/agent-kit";

import { env } from "../../env";

export const anthropicModel = anthropic({
	model: "claude-3-5-haiku-latest",
	defaultParameters: { temperature: 0.1, max_tokens: 4096 },
	apiKey: env.ANTHROPIC_API_KEY,
});

export function createAnthropicModel(modelName: string) {
	return anthropic({
		model: modelName,
		defaultParameters: { temperature: 0.1, max_tokens: 4096 },
		apiKey: env.ANTHROPIC_API_KEY,
	});
}
