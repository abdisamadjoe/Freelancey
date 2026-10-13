"use client";

import { ColorField } from "@/components/app/color-field";
import { ActionButton, CheckInput, Loading, Panel, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Branding {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  logoKey?: string;
  organizationId?: string;
  hideLogo?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

/** Company name, logo, brand colours and the branded login URL. */
export function BrandingPanel() {
  const router = useRouter();
  const session = useSession();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [orgName, setOrgName] = useState(session.organization.name);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cacheBust, setCacheBust] = useState(() => Date.now());

  useEffect(() => {
    apiFetch<Branding>("/branding")
      .then(setBranding)
      .catch(() => setBranding({ primaryColor: "#665df5", accentColor: "#ff6b5c" }));
  }, []);

  if (!branding) return <Loading />;

  const logoSrc = branding.logoKey
    ? `${API_URL}/api/branding/logo/${branding.organizationId}?v=${cacheBust}`
    : branding.logoUrl || null;
  const slug = session.organization.slug;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!branding) return;
    setSaving(true);
    try {
      await Promise.all([
        apiFetch("/branding", {
          method: "PUT",
          body: JSON.stringify({ primaryColor: branding.primaryColor, accentColor: branding.accentColor, hideLogo: branding.hideLogo ?? false }),
        }),
        apiFetch("/organizations/current", { method: "PATCH", body: JSON.stringify({ name: orgName.trim() }) }),
      ]);
      toast.success("Workspace saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const updated = await apiFetch<Branding>("/branding/logo", { method: "POST", body: fd });
      setBranding((b) => ({ ...(b as Branding), ...updated }));
      setCacheBust(Date.now());
      toast.success("Logo updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploading(false);
    }
  }

  async function removeLogo() {
    try {
      const updated = await apiFetch<Branding>("/branding/logo", { method: "DELETE" });
      setBranding((b) => ({ ...(b as Branding), ...updated }));
      setCacheBust(Date.now());
      toast.success("Logo removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove logo");
    }
  }

  return (
    <form onSubmit={save}>
      <Panel title="Branding" description="Customize your client portal appearance with your company name, logo, and brand colors.">
        <div className="space-y-5">
          <div className="max-w-md">
            <TextInput
              label="Company Name"
              value={orgName}
              onChange={setOrgName}
              placeholder="Your company name"
              hint="Displayed in the sidebar and client portal header."
            />
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-input-label-text">Company Logo</span>
            <p className="text-xs text-text-tertiary">PNG, JPEG, SVG, or WebP. Max 5MB. Displayed in the client portal header.</p>
            <div className="flex flex-wrap items-center gap-4">
              {logoSrc && (
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border-[0.5px] border-card-border bg-background-gray-primary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoSrc} alt="Current logo" className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="sr-only"
                  accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) uploadLogo(f);
                  }}
                />
                <span className="inline-flex h-9 items-center rounded-lg border border-button-outline-border px-3 text-sm font-medium text-text-primary">
                  {uploading ? "Uploading..." : logoSrc ? "Replace" : "Upload logo"}
                </span>
              </label>
              {logoSrc && branding.logoKey && (
                <Button size="sm" variant="danger" appearance="outline" onPress={removeLogo}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          <CheckInput
            checked={branding.hideLogo ?? false}
            onChange={(v) => setBranding({ ...branding, hideLogo: v })}
            label="Hide logo in sidebar"
          />

          {slug && (
            <div className="max-w-xl space-y-1.5 rounded-lg bg-background-gray-secondary_alt p-4">
              <p className="text-xs font-medium text-text-primary">Branded login URL</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-card-background px-2 py-1 text-xs text-text-secondary">
                  {typeof window !== "undefined" ? window.location.origin : ""}/login/{slug}
                </code>
                <Button
                  size="xs"
                  appearance="outline"
                  variant="primary"
                  onPress={() => navigator.clipboard.writeText(`${window.location.origin}/login/${slug}`).then(() => toast.success("Link copied"))}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-text-tertiary">Share this with your team and clients for a branded sign-in page.</p>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-input-label-text">Primary Color</span>
              <ColorField value={branding.primaryColor} onChange={(hex) => setBranding({ ...branding, primaryColor: hex })} />
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-input-label-text">Accent Color</span>
              <ColorField value={branding.accentColor} onChange={(hex) => setBranding({ ...branding, accentColor: hex })} />
            </div>
          </div>

          <ActionButton type="submit" variant="primary" loading={saving}>
            {saving ? "Saving..." : "Save"}
          </ActionButton>
        </div>
      </Panel>
    </form>
  );
}
