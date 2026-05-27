import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

// D-10: twoFactorClient intercepts auth responses that contain a
// "2FA required" signal and redirects to /two-factor automatically.
export const authClient = createAuthClient({
  plugins: [
    twoFactorClient(),
  ],
  // No baseURL = uses current page origin (works for any deployment)
});
