import { createNetwork } from "@inngest/agent-kit";

import { codeAgent } from "./code-agent";

export const codingAgentNetwork = createNetwork({
  name: "coding-agent-network",
  description: "A network for the coding agent",
  agents: [codeAgent],
  maxIter: 15, // max iterations
  router: async ({ network }) => {
    const summary = network.state.data.summary;

    // if found summary, break the network
    if (summary) {
      return;
    }

    // if not found summary, continue the network
    return codeAgent;
  },
});
