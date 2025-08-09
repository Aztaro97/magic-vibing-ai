import type { createAgent } from "@inngest/agent-kit";
import { createNetwork } from "@inngest/agent-kit";

import { codeAgent } from "./code-agent";

export const codingAgentNetwork = createNetwork({
	name: "coding-agent-network",
	description: "A network for the coding agent",
	agents: [codeAgent],
	maxIter: 15, // max iterations
	router: async ({ network }) => {
		const summary = network.state.data.summary;
		if (summary) return;
		return codeAgent;
	},
});

export function buildCodingAgentNetwork(agent: ReturnType<typeof createAgent>) {
	return createNetwork({
		name: "coding-agent-network",
		description: "A network for the coding agent",
		agents: [agent],
		maxIter: 15,
		router: async ({ network }) => {
			const summary = network.state.data.summary;
			if (summary) return;
			return agent;
		},
	});
}

