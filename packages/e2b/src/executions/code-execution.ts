import { getDefaultSandbox } from "../config";

export const codeExecution = async (code: string) => {
  const sandbox = await getDefaultSandbox();
  const result = await sandbox.runCode(code);
  return result;
};
