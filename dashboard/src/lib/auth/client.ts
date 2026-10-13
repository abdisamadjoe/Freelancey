"use client";

import { jwtClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser-side Better Auth client. It talks to this app's own /api/auth proxy route
// (src/app/api/auth/[...path]/route.ts), which forwards to the API, so the session
// cookie is first-party for this origin. `authClient.token()` returns the short-lived
// JWT that apiFetch sends to the API as a bearer token.
export const authClient = createAuthClient({
  plugins: [jwtClient()],
});
