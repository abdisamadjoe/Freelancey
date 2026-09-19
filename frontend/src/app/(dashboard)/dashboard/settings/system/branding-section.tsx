"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Upload, Copy, Check } from "lucide-react";
import { Button, buttonStyles, Checkbox, Field, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Branding {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  logoKey?: string;
  organizationId?: string;
  hideLogo?: boolean;
}

export function BrandingSection({
  branding,
  onBrandingChange,
  orgName,
  orgSlug,
}: {
  branding: Branding;
  onBrandingChange: (branding: Branding) => void;
  orgName?: string;
  orgSlug?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { error: showError } = useToast();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const updated = await apiFetch<Branding>("/branding/logo", {
        method: "POST",
        body: formData,
      });
      onBrandingChange({ ...branding, ...updated });
      setCacheBust(Date.now());
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleLogoDelete = async () => {
    try {
      const updated = await apiFetch<Branding>("/branding/logo", {
        method: "DELETE",
      });
      onBrandingChange({ ...branding, ...updated });
      setCacheBust(Date.now());
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to remove logo");
    }
  };

  const [cacheBust, setCacheBust] = useState(() => Date.now());
  const logoSrc = branding.logoKey
    ? `${API_URL}/api/branding/logo/${branding.organizationId}?v=${cacheBust}`
    : branding.logoUrl || null;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Company Logo</Label>
        <p className="text-xs leading-5 text-text-tertiary">
          PNG, JPEG, SVG, or WebP. Max 5MB. Displayed in the client portal header.
        </p>

        {logoSrc ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg border-[0.5px] border-card-border bg-background-gray-primary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="Current logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <label
                className={cn(
                  buttonStyles({ variant: "primary", appearance: "outline", size: "sm" }),
                  uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                )}
              >
                {uploading ? "Uploading..." : "Replace"}
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
              </label>
              <Button type="button" variant="danger" appearance="outline" size="sm" onClick={handleLogoDelete}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <label className="flex w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-card-border bg-background-gray-primary px-6 py-8 transition-colors hover:border-input-border hover:bg-background-gray-secondary_alt">
            <Upload className="mb-2 size-5 text-icon-tertiary" aria-hidden />
            <span className="text-sm text-text-tertiary">
              {uploading ? "Uploading..." : "Click to upload your logo"}
            </span>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
              onChange={handleLogoUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      <div className="max-w-md">
        <Checkbox
          id="branding-hide-logo"
          checked={branding.hideLogo ?? false}
          onChange={(e) => onBrandingChange({ ...branding, hideLogo: e.target.checked })}
          label="Hide logo in sidebar"
          description="Hide the logo from the sidebar and portal header. Useful if you don't have a company logo yet."
        />
      </div>

      {orgSlug && (
        <div className="max-w-xl space-y-1.5 rounded-lg bg-background-gray-secondary_alt p-4">
          <p className="text-xs font-medium text-text-primary">Branded login URL</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md bg-card-background px-2 py-1 font-mono text-xs text-text-secondary">
              {typeof window !== "undefined" ? window.location.origin : ""}/login/{orgSlug}
            </code>
            <Button
              type="button"
              appearance="outline"
              variant="primary"
              size="xs"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/login/${orgSlug}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-xs leading-5 text-text-tertiary">
            Share this with your team and clients for a branded sign-in page.
            On self-hosted instances, uploading a logo automatically shows it on <code className="font-mono">/login</code>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Primary Color" htmlFor="branding-primary-color">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={branding.primaryColor}
              onChange={(e) =>
                onBrandingChange({ ...branding, primaryColor: e.target.value })
              }
              aria-label="Primary color"
              className="size-10 shrink-0 cursor-pointer rounded-lg border-[0.5px] border-card-border bg-input-background p-1"
            />
            <Input
              id="branding-primary-color"
              type="text"
              value={branding.primaryColor}
              onChange={(e) =>
                onBrandingChange({ ...branding, primaryColor: e.target.value })
              }
              className="font-mono"
            />
          </div>
        </Field>

        <Field label="Accent Color" htmlFor="branding-accent-color">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={branding.accentColor}
              onChange={(e) =>
                onBrandingChange({ ...branding, accentColor: e.target.value })
              }
              aria-label="Accent color"
              className="size-10 shrink-0 cursor-pointer rounded-lg border-[0.5px] border-card-border bg-input-background p-1"
            />
            <Input
              id="branding-accent-color"
              type="text"
              value={branding.accentColor}
              onChange={(e) =>
                onBrandingChange({ ...branding, accentColor: e.target.value })
              }
              className="font-mono"
            />
          </div>
        </Field>
      </div>

      <div className="max-w-xl rounded-lg border-[0.5px] border-card-border bg-card-background p-4">
        <p className="mb-3 text-sm font-medium text-text-primary">Preview</p>
        <div className="flex items-center gap-3 rounded-lg border-[0.5px] border-card-border bg-background-gray-primary p-3">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="Logo preview" className="h-8" />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-md bg-background-gray-secondary text-xs text-text-tertiary">
              Logo
            </div>
          )}
          <span className="flex-1 truncate text-sm font-semibold text-text-primary">
            {orgName || "Freelancey"}
          </span>
          <div className="flex gap-2">
            <div
              className="size-6 rounded-md border-[0.5px] border-card-border"
              style={{ backgroundColor: branding.primaryColor }}
            />
            <div
              className="size-6 rounded-md border-[0.5px] border-card-border"
              style={{ backgroundColor: branding.accentColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
