import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContractSign, type PublicContract } from "./contract-sign";
import { ThemeToggle } from "@/components/theme-toggle";

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

  const style = contract.primaryColor
    ? ({
        "--primary": contract.primaryColor,
        "--brand-500": contract.primaryColor,
        "--brand-600": `color-mix(in srgb, ${contract.primaryColor}, #000 15%)`,
      } as React.CSSProperties)
    : undefined;

  return (
    <main style={style} data-branded={style ? "" : undefined} className="relative min-h-screen bg-background-gray-secondary_alt_2 px-4 py-10 sm:py-16">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="mx-auto w-full max-w-3xl">
        <ContractSign token={token} initial={contract} />
      </div>
    </main>
  );
}
