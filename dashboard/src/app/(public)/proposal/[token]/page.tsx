import { PublicShell } from "@/components/app/public";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProposalView, type PublicProposal } from "./proposal-view";

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

  return (
    <PublicShell primaryColor={proposal.primaryColor}>
      <ProposalView token={token} initial={proposal} />
    </PublicShell>
  );
}
