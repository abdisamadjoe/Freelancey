import { PublicShell } from "@/components/app/public";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContractSign, type PublicContract } from "./contract-sign";

const API_URL = process.env.API_URL || "http://localhost:3001";

async function getContract(token: string): Promise<PublicContract | null> {
  try {
    const res = await fetch(`${API_URL}/api/contracts/public/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicContract;
  } catch {
    return null;
  }
}

export const metadata: Metadata = { title: "Contract", robots: { index: false, follow: false } };

export default async function ContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const contract = await getContract(token);
  if (!contract) notFound();

  return (
    <PublicShell primaryColor={contract.primaryColor} wide>
      <ContractSign token={token} initial={contract} />
    </PublicShell>
  );
}
