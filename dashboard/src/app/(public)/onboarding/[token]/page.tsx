import { PublicFormPage } from "@/components/app/public-form-page";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Client onboarding", robots: { index: false, follow: false } };

export default async function OnboardingFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicFormPage token={token} />;
}
