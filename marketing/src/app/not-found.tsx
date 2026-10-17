import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Gigly: Page Not Found", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <section className="flex flex-col items-center gap-6 px-4 py-[130px] text-center">
      <h1 className="t-h1 text-ink">404</h1>
      <p className="t-body text-body">This page could not be found.</p>
      <Link href="/" className="t-body-sb text-primary">
        Back to home
      </Link>
    </section>
  );
}
