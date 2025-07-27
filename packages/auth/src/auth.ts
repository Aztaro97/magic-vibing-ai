import type { BetterAuthOptions } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy, phoneNumber } from "better-auth/plugins";

import { db } from "@acme/db/client";

import { env } from "../env";

export const config = {
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: env.AUTH_SECRET,
  plugins: [
    oAuthProxy(),
    phoneNumber({
      sendOTP: ({ phoneNumber, code }, request) => {
        // Implement sending OTP code via SMS
        console.log(phoneNumber, code, request);
      },
    }),
    expo(),
  ],
  emailAndPassword: {
    enabled: true,
    async sendResetPassword(data, request) {
      // Send an email to the user with a link to reset their password
      console.log(data, request);
    },
  },
  socialProviders: {
    // google: {
    // 	clientId: env.GOOGLE_CLIENT_ID,
    // 	clientSecret: env.GOOGLE_CLIENT_SECRET,
    // },
  },

  // Allow any origin including Expo's deep links
  // This should be restricted in production to specific origins
  trustedOrigins: [
    "http://localhost:8081", // Allow localhost Web
    "*", // Allow all web origins
    "pet-cal-app://", // Expo app scheme
    "exp://", // Expo Go scheme
    "https://*.expo.dev", // Expo web previews,
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth(config);
export type Session = typeof auth.$Infer.Session;
