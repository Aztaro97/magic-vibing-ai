import { createAgent } from '@inngest/agent-kit';
import { openAIModel } from './models/open-ai-model';


const codeAgentWriter = createAgent({
	name: 'Code writer',
	description:
		'An expert TypeScript programmer which can write and debug code. Call this when custom code is required to complete a task.',
	system: `You are a helpful assistant that can write and debug code.	`,
	model: openAIModel,
});


export const codeAgent = codeAgentWriter;