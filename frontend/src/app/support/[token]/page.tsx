import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { SupportForm } from "./support-form";
import { ThemeToggle } from "@/components/theme-toggle";

const API_URL = process.env.API_URL || "http://localhost:3001";

interface SupportPage {
  organizationName: string;
  primaryColor: string | null;
  logoUrl: string | null;
  clientName: string;
  projects: { id: string; name: string }[];
}

async function getPage(token: string): Promise<SupportPage | null> {
  try {
    const res = await fetch(`${API_URL}/api/support/public/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as SupportPage;
  } catch {
    return null;
  }
}

export const metadata: Metadata = { title: "Support", robots: { index: false, follow: false } };

export default async function SupportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const page = await getPage(token);
  if (!page) notFound();

  const style = page.primaryColor
    ? ({
        "--primary": page.primaryColor,
        "--brand-500": page.primaryColor,
        "--brand-600": `color-mix(in srgb, ${page.primaryColor}, #000 15%)`,
      } as React.CSSProperties)
    : undefined;

  return (
    <main style={style} data-branded={style ? "" : undefined} className="relative min-h-screen bg-background-gray-secondary_alt_2 px-4 py-10 sm:py-16">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 text-center">
          {page.logoUrl && <Image src={page.logoUrl} alt="" width={56} height={56} unoptimized className="mx-auto mb-3 size-14 rounded-lg object-contain" />}
          <h1 className="text-2xl font-semibold text-text-primary">Need help, {page.clientName}?</h1>
          <p className="mt-2 text-sm text-text-tertiary">Tell {page.organizationName} what is wrong and they will get back to you.</p>
        </div>
        <SupportForm token={token} projects={page.projects} />
      </div>
    </main>
  );
}
