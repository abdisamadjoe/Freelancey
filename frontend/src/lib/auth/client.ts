"use client";

import { createAuthClient } from "@neondatabase/auth/next";

// Browser-side Neon Auth client, used both in React components and outside
// of them (e.g. in apiFetch). Talks to this app's own /api/auth/[...path]
// proxy route (see lib/auth/server.ts), so no baseURL is needed here.
export const authClient = createAuthClient();
