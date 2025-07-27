import * as SecureStore from "expo-secure-store";
import { expoClient } from "@better-auth/expo/client";
import { Env } from "@env";
import { phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: Env.API_URL || "http://localhost:3000",
  plugins: [
    expoClient({
      scheme: "expo",
      // storagePrefix: Env.BUNDLE_ID,
      storage: SecureStore,
    }),
    phoneNumberClient(),
  ],
});

export const { signIn, signOut, useSession, phoneNumber } = authClient;
