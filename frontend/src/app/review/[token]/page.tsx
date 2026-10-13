import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ReviewView, type PublicDeliverable } from "./review-view";
import { ThemeToggle } from "@/components/theme-toggle";

const API_URL = process.env.API_URL || "http://localhost:3001";

async function getDeliverable(token: string): Promise<PublicDeliverable | null> {
  try {
    const res = await fetch(`${API_URL}/api/deliverables/public/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicDeliverable;
  } catch {
    return null;
  }
}

export const metadata: Metadata = { title: "Review", robots: { index: false, follow: false } };

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const deliverable = await getDeliverable(token);
  if (!deliverable) notFound();

  const style = deliverable.primaryColor
    ? ({
        "--primary": deliverable.primaryColor,
        "--brand-500": deliverable.primaryColor,
        "--brand-600": `color-mix(in srgb, ${deliverable.primaryColor}, #000 15%)`,
      } as React.CSSProperties)
    : undefined;

  return (
    <main style={style} data-branded={style ? "" : undefined} className="relative min-h-screen bg-background-gray-secondary_alt_2 px-4 py-10 sm:py-16">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="mx-auto w-full max-w-2xl">
        <ReviewView token={token} initial={deliverable} />
      </div>
    </main>
  );
}
