import { PublicHeader, PublicShell } from "@/components/app/public";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupportForm } from "./support-form";

const API_URL = process.env.API_URL || "http://localhost:3001";

interface SupportPageData {
  organizationName: string;
  primaryColor: string | null;
  logoUrl: string | null;
  clientName: string;
  projects: { id: string; name: string }[];
}

async function getPage(token: string): Promise<SupportPageData | null> {
  try {
    const res = await fetch(`${API_URL}/api/support/public/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as SupportPageData;
  } catch {
    return null;
  }
}

export const metadata: Metadata = { title: "Support", robots: { index: false, follow: false } };

export default async function SupportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const page = await getPage(token);
  if (!page) notFound();

  return (
    <PublicShell primaryColor={page.primaryColor}>
      <PublicHeader
        logoUrl={page.logoUrl}
        title={`Need help, ${page.clientName}?`}
        subtitle={`Tell ${page.organizationName} what is wrong and they will get back to you.`}
      />
      <SupportForm token={token} projects={page.projects} />
    </PublicShell>
  );
}
