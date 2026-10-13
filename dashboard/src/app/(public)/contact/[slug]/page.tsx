import { PublicHeader, PublicShell } from "@/components/app/public";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "./contact-form";

const API_URL = process.env.API_URL || "http://localhost:3001";

interface PublicForm {
  name: string;
  primaryColor: string | null;
  logoUrl: string | null;
}

async function getForm(slug: string): Promise<PublicForm | null> {
  try {
    const res = await fetch(`${API_URL}/api/leads/public/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicForm;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const form = await getForm(slug);
  return form ? { title: `Contact ${form.name}`, robots: { index: false } } : {};
}

export default async function ContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await getForm(slug);
  if (!form) notFound();

  return (
    <PublicShell primaryColor={form.primaryColor}>
      <PublicHeader
        logoUrl={form.logoUrl}
        title={`Get in touch with ${form.name}`}
        subtitle="Tell us a little about what you need and we will reply as soon as we can."
      />
      <ContactForm slug={slug} />
    </PublicShell>
  );
}
