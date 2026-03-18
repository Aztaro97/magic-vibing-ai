import { auth } from "@acme/auth";
import { initApiPassthrough } from "langgraph-nextjs-api-passthrough";

import { env } from "~/env";


export const dynamic = "force-dynamic";
export const maxDuration = 300;

// This file acts as a proxy for requests to your LangGraph server.
// Read the [Going to Production](https://github.com/langchain-ai/agent-chat-ui?tab=readme-ov-file#going-to-production) section for more information.

const LANGGRAPH_CLOUD_ENDPOINT = "https://platform.langchain.com"; // TODO: change to cloud production langgraph endpoint and add the key in env var

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS, runtime } =
	initApiPassthrough({
		baseRoute: "langgraph",
		apiUrl:
			env.NODE_ENV === "development"
				? "http://localhost:2024"
				: LANGGRAPH_CLOUD_ENDPOINT, // default, if not defined it will attempt to read process.env.LANGGRAPH_API_URL
		apiKey: env.LANGCHAIN_API_KEY, // default, if not defined it will attempt to read process.env.LANGSMITH_API_KEY
		headers: async (req) => {
			const session = await auth.api.getSession({ headers: req.headers });
			if (!session?.user) throw new Error("Unauthorized");
			return {
				Authorization: `Bearer ${env.LANGCHAIN_API_KEY}`,
				"x-user-id": session.user.id,
			};
		},
		runtime: "nodejs", // default
		disableWarningLog: false,
	});
