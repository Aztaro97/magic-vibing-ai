import { fileURLToPath } from "url";
import createJiti from "jiti";

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
createJiti(fileURLToPath(import.meta.url))("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@acme/api",
    "@acme/auth",
    "@acme/db",
    "@acme/ui",
    "@acme/validators",
    "@acme/pusher",
    "@acme/jobs",
    "@acme/error-handler",
    "@acme/agent",
    "@acme/e2b",
    "@acme/deep-agents",
    "@acme/sandboxes",
    "@acme/webhooks",
  ],

  /**
   * Prevent Turbopack/webpack from compiling these heavy server-only packages.
   * @acme/deep-agents exports raw TS and pulls in @langchain/langgraph + all LLM
   * SDKs (thousands of modules). Turbopack compiling them on first request causes
   * the JS heap OOM crash. Marking them external means Next.js uses require() at
   * runtime instead of bundling/compiling them.
   */
  serverExternalPackages: [
    // LangGraph / LangChain ecosystem
    "@langchain/langgraph",
    "@langchain/langgraph-sdk",
    "@langchain/langgraph-checkpoint",
    "@langchain/core",
    "@langchain/anthropic",
    "@langchain/openai",
    "@langchain/google-genai",
    "@langchain/community",
    "@langchain/ollama",
    "@langchain/tavily",
    "langchain",
    "deepagents",
    "langsmith",
    // LLM provider SDKs
    "@anthropic-ai/sdk",
    "openai",
    "@google/generative-ai",
    // Sandbox SDKs (heavy native/wasm modules)
    "@e2b/code-interpreter",
    "@daytonaio/sdk",
    // LangGraph API passthrough (proxies to external server, not for bundling)
    "langgraph-nextjs-api-passthrough",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  // @ts-expect-error - eslint config is widely supported by Next.js compiler
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default config;
