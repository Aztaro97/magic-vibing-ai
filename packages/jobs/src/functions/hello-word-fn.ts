import { inngestClient } from "../client";



export const helloWordFn = inngestClient.createFunction(
	{ id: "hello-word-id" },
	{ event: "hello-word-fn" },
	async ({ event, step }) => {
		await step.sleep("sleep-10-seconds", 10000);
		await step.sleep("sleep-20-seconds", 20000);

		return {
			message: `Hello World ${event.data.message}`,
		};
	}
);