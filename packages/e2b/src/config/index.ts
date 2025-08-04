import { Sandbox } from "@e2b/code-interpreter";

import { env } from "../../env";

export const sbx = await Sandbox.create("expo-web-app", {
  apiKey: env.E2B_API_KEY,
});
