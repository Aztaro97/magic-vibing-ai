import { getSandbox } from "@acme/agents/utils";
import { createExpoSandbox } from "@acme/e2b/config";

import { inngestClient } from "../client";

export const helloWordFn = inngestClient.createFunction(
	{ id: "hello-word-id" },
	{ event: "hello-word-fn" },
	async ({ event, step }) => {
		const sandboxId = await step.run("create-expo-sandbox", async () => {
			const sandbox = await createExpoSandbox({ projectName: "hello-word" });
			return sandbox.sandboxId;
		});

		// const result = await codingAgentNetwork.run(event.data.value)

		const sandboxUrl = await step.run("get-sandbox-url", async () => {
			const sandbox = await getSandbox(sandboxId);
			const host = sandbox.getHost(8081);
			return `https://${host}`;
		});

		return {
			url: sandboxUrl,
			title: "Fragment",
			// files: result.state.data.files,
			// summary: result.state.data.summary,
		};
	},
);
