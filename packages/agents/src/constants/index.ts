export interface ModelOption {
	provider: "openai" | "anthropic" | "gemini";
	name: string;
	models: string[];
}

export const LLM_MODELS: ModelOption[] = [
	{
		provider: "openai",
		name: "OpenAI",
		models: [
			"gpt-4.5-preview",
			"gpt-4o",
			"chatgpt-4o-latest",
			"gpt-4o-mini",
			"gpt-4",
			"o1",
			"o1-preview",
			"o1-mini",
			"o3-mini",
			"gpt-4-turbo",
			"gpt-3.5-turbo",
		],
	},
	// {
	// 	provider: "gemini",
	// 	name: "Gemini",
	// 	models: [
	// 		"gemini-1.5-flash",
	// 		"gemini-1.5-flash-8b",
	// 		"gemini-1.5-pro",
	// 	],
	// },
	{
		provider: "anthropic",
		name: "Anthropic",
		models: [
			"claude-3-5-sonnet-latest",
			"claude-3-5-haiku-latest",
			"claude-3-opus-latest",
		],
	},
];

export const DEFAULT_MODEL = "claude-3-5-sonnet-latest";

