import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProposalView, type PublicProposal } from "./proposal-view";
import { ThemeToggle } from "@/components/theme-toggle";

const API_URL = process.env.API_URL || "http://localhost:3001";

async function getProposal(token: string): Promise<PublicProposal | null> {
  try {
    const res = await fetch(`${API_URL}/api/proposals/public/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicProposal;
  } catch {
    return null;
  }
}

export const metadata: Metadata = { title: "Proposal", robots: { index: false, follow: false } };

export default async function ProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proposal = await getProposal(token);
  if (!proposal) notFound();

  const style = proposal.primaryColor
    ? ({
        "--primary": proposal.primaryColor,
        "--brand-500": proposal.primaryColor,
        "--brand-600": `color-mix(in srgb, ${proposal.primaryColor}, #000 15%)`,
      } as React.CSSProperties)
    : undefined;

  return (
    <main style={style} data-branded={style ? "" : undefined} className="relative min-h-screen bg-background-gray-secondary_alt_2 px-4 py-10 sm:py-16">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="mx-auto w-full max-w-2xl">
        <ProposalView token={token} initial={proposal} />
      </div>
    </main>
  );
}
