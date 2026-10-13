import { PublicFormPage } from "@/components/app/public-form-page";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Project brief", robots: { index: false, follow: false } };

export default async function BriefFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicFormPage token={token} />;
}
