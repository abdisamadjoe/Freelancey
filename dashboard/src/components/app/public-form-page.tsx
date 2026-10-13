import { PublicForm } from "@/components/app/public-form";
import { PublicShell } from "@/components/app/public";
import type { PublicFormData } from "@/lib/form-links";
import { notFound } from "next/navigation";

const API_SERVER = process.env.API_URL || "http://localhost:3001";

/** Shared server page for the onboarding and project brief links. The token decides which form it is. */
export async function PublicFormPage({ token }: { token: string }) {
  let form: PublicFormData | null = null;
  try {
    const res = await fetch(`${API_SERVER}/api/forms/public/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (res.ok) form = (await res.json()) as PublicFormData;
  } catch {
    form = null;
  }
  if (!form) notFound();

  return (
    <PublicShell primaryColor={form.primaryColor}>
      <PublicForm token={token} initial={form} />
    </PublicShell>
  );
}
