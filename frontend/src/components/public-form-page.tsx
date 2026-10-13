import { notFound } from "next/navigation";
import { PublicForm } from "@/components/public-form";
import { ThemeToggle } from "@/components/theme-toggle";
import type { PublicFormData } from "@/lib/form-links";

const API_URL = process.env.API_URL || "http://localhost:3001";

async function getForm(token: string): Promise<PublicFormData | null> {
  try {
    const res = await fetch(`${API_URL}/api/forms/public/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicFormData;
  } catch {
    return null;
  }
}

/** Shared server page for the onboarding and project brief links. The token decides which form it is. */
export async function PublicFormPage({ token }: { token: string }) {
  const form = await getForm(token);
  if (!form) notFound();

  const style = form.primaryColor
    ? ({
        "--primary": form.primaryColor,
        "--brand-500": form.primaryColor,
        "--brand-600": `color-mix(in srgb, ${form.primaryColor}, #000 15%)`,
      } as React.CSSProperties)
    : undefined;

  return (
    <main style={style} data-branded={style ? "" : undefined} className="relative min-h-screen bg-background-gray-secondary_alt_2 px-4 py-10 sm:py-16">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="mx-auto w-full max-w-2xl">
        <PublicForm token={token} initial={form} />
      </div>
    </main>
  );
}
