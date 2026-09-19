"use client";

import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";
import {
  Alert,
  Button,
  buttonStyles,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Branding {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  logoKey?: string;
  organizationId?: string;
}

interface StepOrgProfileProps {
  orgName: string;
  onNext: () => void;
}

export function StepOrgProfile({ orgName, onNext }: StepOrgProfileProps) {
  const [name, setName] = useState(orgName);

  // Sync local state when the parent finishes loading the org name
  useEffect(() => {
    if (orgName) setName(orgName);
  }, [orgName]);

  const [branding, setBranding] = useState<Branding>({
    primaryColor: "#665df5",
    accentColor: "#ff6b5c",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<Branding>("/branding").then(setBranding).catch(() => {});
  }, []);

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
      setBranding((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
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
      setBranding((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove logo");
    }
  };

  const handleNext = async () => {
    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/organizations/current", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });

      // Update branding colors
      await apiFetch("/branding", {
        method: "PUT",
        body: JSON.stringify({
          primaryColor: branding.primaryColor,
          accentColor: branding.accentColor,
        }),
      });

      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const logoSrc = branding.logoKey
    ? `${API_URL}/api/branding/logo/${branding.organizationId}`
    : branding.logoUrl || null;

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Organization Profile</CardTitle>
          <CardDescription>
            Set up your organization name and branding. This is what your clients
            will see.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && <Alert status="error">{error}</Alert>}

        {/* Organization Name */}
        <Field label="Organization Name" htmlFor="setup-org-name">
          <Input
            id="setup-org-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your agency or company name"
          />
        </Field>

        {/* Logo Upload */}
        <Field
          label="Company Logo"
          description="PNG, JPEG, SVG, or WebP. Max 2MB."
        >
          {logoSrc ? (
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt="Current logo"
                  className="max-h-full max-w-full object-contain"
                />
              </span>
              <div className="flex items-center gap-2">
                <label
                  className={cn(
                    buttonStyles({
                      variant: "primary",
                      appearance: "outline",
                      size: "sm",
                    }),
                    "cursor-pointer",
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
                <Button
                  type="button"
                  variant="danger"
                  appearance="outline"
                  size="sm"
                  onClick={handleLogoDelete}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-button-primary-outline-stroke bg-input-background p-8 text-center transition-colors hover:bg-background-gray-secondary_alt_2">
              <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-full border-[0.5px] border-card-border bg-background-gray-secondary_alt text-text-secondary"
              >
                <Upload className="size-5" />
              </span>
              <span className="space-y-1">
                <span className="block text-sm font-medium text-text-primary">
                  {uploading ? "Uploading..." : "Click to upload your logo"}
                </span>
                <span className="block text-xs text-input-placeholder-text">
                  {uploading ? "Please wait…" : "Drag & drop or browse from your device"}
                </span>
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
        </Field>

        {/* Colors */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Primary Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Primary color picker"
                value={branding.primaryColor}
                onChange={(e) =>
                  setBranding({ ...branding, primaryColor: e.target.value })
                }
                className="size-10 shrink-0 cursor-pointer rounded-lg border-[0.5px] border-card-border bg-input-background p-0.5"
              />
              <Input
                type="text"
                aria-label="Primary color hex value"
                value={branding.primaryColor}
                onChange={(e) =>
                  setBranding({ ...branding, primaryColor: e.target.value })
                }
                className="w-32 font-mono text-xs"
              />
            </div>
          </Field>

          <Field label="Accent Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Accent color picker"
                value={branding.accentColor}
                onChange={(e) =>
                  setBranding({ ...branding, accentColor: e.target.value })
                }
                className="size-10 shrink-0 cursor-pointer rounded-lg border-[0.5px] border-card-border bg-input-background p-0.5"
              />
              <Input
                type="text"
                aria-label="Accent color hex value"
                value={branding.accentColor}
                onChange={(e) =>
                  setBranding({ ...branding, accentColor: e.target.value })
                }
                className="w-32 font-mono text-xs"
              />
            </div>
          </Field>
        </div>

        {/* Preview */}
        <div className="rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2 p-4">
          <p className="text-xs font-semibold text-text-secondary">Preview</p>
          <div className="mt-3 flex items-center gap-3 rounded-lg border-[0.5px] border-card-border bg-card-background p-3">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="Logo preview" className="h-8 w-8 object-contain" />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background-gray-secondary text-xs text-text-tertiary">
                Logo
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
              {name || "Your Organization"}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span
                aria-hidden
                className="size-6 rounded border-[0.5px] border-card-border"
                style={{ backgroundColor: branding.primaryColor }}
              />
              <span
                aria-hidden
                className="size-6 rounded border-[0.5px] border-card-border"
                style={{ backgroundColor: branding.accentColor }}
              />
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-end">
        <Button onClick={handleNext} loading={saving}>
          {saving ? "Saving..." : "Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}
