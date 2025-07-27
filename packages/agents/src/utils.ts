/* eslint-disable */
import { Sandbox } from "@e2b/code-interpreter";
import { TextMessage } from "@inngest/agent-kit";


export const lastAssistantTextMessageContent = (result: any) => {
	const lastAssistantMessageIndex = result.output.findLastIndex(
		(message: any) => message.role === "assistant"
	);
	const message = result.output[lastAssistantMessageIndex] as
		| TextMessage
		| undefined;
	return message?.content
		? typeof message.content === "string"
			? message.content
			: message.content.map((c) => c.text).join("")
		: undefined;
}



export async function getSandbox(sandboxId: string) {
	const sandbox = await Sandbox.connect(sandboxId);
	await sandbox.setTimeout(5 * 60_000);
	return sandbox;
}