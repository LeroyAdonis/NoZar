import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // No baseURL = uses current page origin (works for any deployment)
});
