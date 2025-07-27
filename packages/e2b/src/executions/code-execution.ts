import { sbx } from "../config";


export const codeExecution = async (code: string) => {
	const sandbox = await sbx.runCode(code);

	return sandbox;
}