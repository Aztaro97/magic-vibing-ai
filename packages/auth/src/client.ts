import {
  adminClient,
  genericOAuthClient,
  multiSessionClient,
  oidcClient,
  organizationClient,
  passkeyClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { toast } from "sonner";

const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    // twoFactorClient({
    //  onTwoFactorRedirect() {
    //      window.location.href = "/two-factor";
    //  },
    // }),
    passkeyClient(),
    adminClient(),
    multiSessionClient(),
    // oneTapClient({
    //  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    //  promptOptions: {
    //      maxAttempts: 1,
    //  },
    // }),
    oidcClient(),
    genericOAuthClient(),
    // stripeClient({
    //  subscription: true,
    // }),
  ],
  fetchOptions: {
    onError(e) {
      if (e.error.status === 401) {
        // toast.error('Unauthorized. Please sign in again.')
        console.warn("Unauthorized. Please sign in again.");
      } else if (e.error.status === 429) {
        toast.error("Too many requests. Please try again later.");
      } else if (e.error.status === 500) {
        toast.error("Server error. Please try again later.");
      }
    },
  },
});

export const {
  signUp,
  signIn,
  signOut,
  useSession,
  organization,
  useListOrganizations,
  useActiveOrganization,
} = authClient;
