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
