import * as Sentry from "@sentry/nextjs";

/** Loads the Sentry config for whichever runtime Next.js starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("../sentry.edge.config");
}

/** Reports errors thrown while handling server requests. */
export const onRequestError = Sentry.captureRequestError;
