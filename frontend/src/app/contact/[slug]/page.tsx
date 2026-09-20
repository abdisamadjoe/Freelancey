import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { ContactForm } from "./contact-form";
import { ThemeToggle } from "@/components/theme-toggle";

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

  // Same brand-token override the branded login page uses.
  const style = form.primaryColor
    ? ({
        "--primary": form.primaryColor,
        "--brand-500": form.primaryColor,
        "--brand-600": `color-mix(in srgb, ${form.primaryColor}, #000 15%)`,
      } as React.CSSProperties)
    : undefined;

  return (
    <main style={style} className="relative min-h-screen bg-background-gray-secondary_alt_2 px-4 py-10 sm:py-16">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-6 text-center">
          {form.logoUrl && (
            <Image
              src={form.logoUrl}
              alt=""
              width={56}
              height={56}
              unoptimized
              className="mx-auto mb-3 size-14 rounded-lg object-contain"
            />
          )}
          <h1 className="text-2xl font-semibold text-text-primary">Get in touch with {form.name}</h1>
          <p className="mt-2 text-sm text-text-tertiary">
            Tell us a little about what you need and we will reply as soon as we can.
          </p>
        </div>
        <ContactForm slug={slug} />
      </div>
    </main>
  );
}
