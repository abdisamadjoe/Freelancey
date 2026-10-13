"use client";

/**
 * Last-resort error page for errors the app's own error boundaries do not catch.
 * It replaces the root layout, so it carries its own minimal styling instead of the app's stylesheet.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error(error);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#ecfdf5", color: "#111827" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1rem", textAlign: "center" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.5rem" }}>Something went wrong</h1>
            <p style={{ margin: "0 0 1.25rem", color: "#4b5563" }}>The page hit an unexpected error. Trying again usually fixes it.</p>
            <button
              type="button"
              onClick={reset}
              style={{ padding: "0.6rem 1.2rem", borderRadius: "0.5rem", border: "none", background: "#064e3b", color: "#ecfdf5", fontSize: "1rem", cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
