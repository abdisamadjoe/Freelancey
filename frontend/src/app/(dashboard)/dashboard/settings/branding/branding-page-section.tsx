"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Field,
  Input,
  SectionHeading,
  Skeleton,
} from "@/components/ui";
import { BrandingSection } from "../system/branding-section";
import { LabelsSection } from "../system/labels-section";

interface Branding {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  logoKey?: string;
  organizationId?: string;
  hideLogo?: boolean;
}


export function BrandingPageSection(): React.ReactElement {
  const [branding, setBranding] = useState<Branding>({
    primaryColor: "#665df5",
    accentColor: "#ff6b5c",
  });
  const [orgName, setOrgName] = useState<string>("");
  const [orgSlug, setOrgSlug] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const router = useRouter();
  const { success, error: showError } = useToast();

  useEffect(() => {
    Promise.all([
      apiFetch<Branding>("/branding"),
      apiFetch<{ organization: { name?: string; slug?: string } }>("/organizations/me").catch(
        () => null,
      ),
    ])
      .then(([brandingData, session]) => {
        setBranding(brandingData);
        if (session?.organization.name) setOrgName(session.organization.name);
        if (session?.organization.slug) setOrgSlug(session.organization.slug);
        setLoading(false);
      })
      .catch((err) => {
        showError(err instanceof Error ? err.message : "Failed to load branding");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        apiFetch("/branding", {
          method: "PUT",
          body: JSON.stringify({
            primaryColor: branding.primaryColor,
            accentColor: branding.accentColor,
            hideLogo: branding.hideLogo ?? false,
          }),
        }),
        apiFetch("/organizations/current", {
          method: "PATCH",
          body: JSON.stringify({ name: orgName.trim() }),
        }),
      ]);
      success("Workspace saved");
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Card>
          <Skeleton className="h-4 w-28" />
          <div className="mt-5 space-y-4">
            <Skeleton className="h-10 w-full max-w-md rounded-lg" />
            <Skeleton className="h-24 w-full max-w-md rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSave}>
        <section>
          <Card>
            <CardHeader>
              <SectionHeading
                title="Branding"
                description="Customize your client portal appearance with your company name, logo, and brand colors."
                className="flex-1"
              />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="max-w-md">
                <Field
                  label="Company Name"
                  htmlFor="workspace-company-name"
                  description="Displayed in the sidebar and client portal header."
                >
                  <Input
                    id="workspace-company-name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Your company name"
                  />
                </Field>
              </div>

              <BrandingSection
                branding={branding}
                onBrandingChange={setBranding}
                orgName={orgName}
                orgSlug={orgSlug}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={saving} loading={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </CardFooter>
          </Card>
        </section>
      </form>

      <section className="space-y-4">
        <SectionHeading
          title="Labels"
          description="Create labels to tag and organize projects, tasks, files, and clients."
        />
        <LabelsSection />
      </section>
    </div>
  );
}
