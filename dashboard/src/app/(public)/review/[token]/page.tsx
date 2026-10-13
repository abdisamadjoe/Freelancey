import { PublicShell } from "@/components/app/public";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type PublicDeliverable, ReviewView } from "./review-view";

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

  return (
    <PublicShell primaryColor={deliverable.primaryColor}>
      <ReviewView token={token} initial={deliverable} />
    </PublicShell>
  );
}
