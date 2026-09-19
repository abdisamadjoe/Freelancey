"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Send } from "lucide-react";
import { enableSentry } from "@/lib/sentry";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Checkbox,
  Field,
  Input,
  Label,
  NativeSelect,
  SectionHeading,
  Skeleton,
} from "@/components/ui";
import { CustomDomainSection } from "../system/custom-domain-section";

interface SystemSettings {
  emailProvider: string | null;
  emailFrom: string | null;
  resendApiKey: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpSecure: boolean;
  maxFileSizeMb: number;
  setupCompleted: boolean;
  telemetryEnabled: boolean | null;
}

const defaultSettings: SystemSettings = {
  emailProvider: null,
  emailFrom: null,
  resendApiKey: null,
  smtpHost: null,
  smtpPort: null,
  smtpUser: null,
  smtpPass: null,
  smtpSecure: true,
  maxFileSizeMb: 50,
  setupCompleted: false,
  telemetryEnabled: null,
};

export function GeneralSection(): React.ReactElement {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testingEmail, setTestingEmail] = useState<boolean>(false);
  const { success, error: showError } = useToast();

  const [editedApiKey, setEditedApiKey] = useState<boolean>(false);
  const [editedSmtpPass, setEditedSmtpPass] = useState<boolean>(false);
  const [hasResendApiKey, setHasResendApiKey] = useState<boolean>(false);
  const [hasSmtpPass, setHasSmtpPass] = useState<boolean>(false);

  useEffect(() => {
    apiFetch<SystemSettings>("/settings")
      .then((data) => {
        setHasResendApiKey(!!data.resendApiKey);
        setHasSmtpPass(!!data.smtpPass);
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        showError(err instanceof Error ? err.message : "Failed to load settings");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        emailProvider: settings.emailProvider,
        emailFrom: settings.emailFrom || null,
        smtpHost: settings.smtpHost || null,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser || null,
        smtpSecure: settings.smtpSecure,
        maxFileSizeMb: settings.maxFileSizeMb,
      };
      if (editedApiKey) payload.resendApiKey = settings.resendApiKey || null;
      if (editedSmtpPass) payload.smtpPass = settings.smtpPass || null;

      const updated = await apiFetch<SystemSettings>("/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setSettings(updated);
      setHasResendApiKey(!!updated.resendApiKey);
      setHasSmtpPass(!!updated.smtpPass);
      setEditedApiKey(false);
      setEditedSmtpPass(false);
      success("Configuration saved");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleTelemetryToggle = async (enabled: boolean): Promise<void> => {
    try {
      const updated = await apiFetch<SystemSettings>("/settings", {
        method: "PATCH",
        body: JSON.stringify({ telemetryEnabled: enabled }),
      });
      setSettings((prev) => ({ ...prev, telemetryEnabled: updated.telemetryEnabled }));
      if (enabled) enableSentry();
      success(enabled ? "Error reporting enabled" : "Error reporting disabled");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update telemetry setting");
    }
  };

  const handleTestEmail = async (): Promise<void> => {
    setTestingEmail(true);
    try {
      const result = await apiFetch<{ success: boolean; message: string }>(
        "/settings/test-email",
        { method: "POST" },
      );
      if (result.success) {
        success(result.message);
      } else {
        showError(result.message);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to send test email");
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        {[0, 1].map((index) => (
          <Card key={index}>
            <Skeleton className="h-4 w-32" />
            <div className="mt-5 space-y-4">
              <Skeleton className="h-10 w-full max-w-md rounded-lg" />
              <Skeleton className="h-10 w-full max-w-md rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSave} className="space-y-5">
        <section>
          <Card>
            <CardHeader>
              <SectionHeading
                title="Email"
                description="Configure how Freelancey sends emails (invitations, password resets, etc.)"
                className="flex-1"
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Email Provider" htmlFor="email-provider">
                  <NativeSelect
                    id="email-provider"
                    value={settings.emailProvider ?? ""}
                    onChange={(e) =>
                      setSettings({ ...settings, emailProvider: e.target.value || null })
                    }
                  >
                    <option value="">None (disabled)</option>
                    <option value="resend">Resend</option>
                    <option value="smtp">SMTP</option>
                  </NativeSelect>
                </Field>

                <Field
                  label="From Email"
                  htmlFor="email-from"
                  description="The sender address for outgoing emails."
                >
                  <Input
                    id="email-from"
                    type="email"
                    placeholder="noreply@example.com"
                    value={settings.emailFrom ?? ""}
                    onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                  />
                </Field>
              </div>

              {settings.emailProvider === "resend" && (
                <div className="rounded-lg border-[0.5px] border-card-border bg-background-gray-primary p-4">
                  <Field
                    label="Resend API Key"
                    htmlFor="resend-api-key"
                    description={
                      !editedApiKey && hasResendApiKey
                        ? "An API key is already configured. Enter a new value to replace it."
                        : undefined
                    }
                  >
                    <Input
                      id="resend-api-key"
                      type="password"
                      placeholder={hasResendApiKey ? "Enter new key to replace" : "re_xxxxxxxx"}
                      value={editedApiKey ? (settings.resendApiKey ?? "") : ""}
                      onChange={(e) => {
                        setEditedApiKey(true);
                        setSettings({ ...settings, resendApiKey: e.target.value });
                      }}
                    />
                  </Field>
                </div>
              )}

              {settings.emailProvider === "smtp" && (
                <div className="space-y-4 rounded-lg border-[0.5px] border-card-border bg-background-gray-primary p-4">
                  <Field label="SMTP Host" htmlFor="smtp-host">
                    <Input
                      id="smtp-host"
                      type="text"
                      placeholder="smtp.example.com"
                      value={settings.smtpHost ?? ""}
                      onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Port" htmlFor="smtp-port">
                      <Input
                        id="smtp-port"
                        type="number"
                        placeholder="587"
                        value={settings.smtpPort ?? ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            smtpPort: e.target.value ? parseInt(e.target.value, 10) : null,
                          })
                        }
                      />
                    </Field>
                    <div className="flex items-end pb-2.5">
                      <Checkbox
                        id="smtp-secure"
                        checked={settings.smtpSecure}
                        onChange={(e) => setSettings({ ...settings, smtpSecure: e.target.checked })}
                        label="Use TLS/SSL"
                      />
                    </div>
                  </div>

                  <Field label="Username" htmlFor="smtp-user">
                    <Input
                      id="smtp-user"
                      type="text"
                      placeholder="SMTP username"
                      value={settings.smtpUser ?? ""}
                      onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    />
                  </Field>

                  <Field
                    label="Password"
                    htmlFor="smtp-pass"
                    description={
                      !editedSmtpPass && hasSmtpPass
                        ? "A password is already configured. Enter a new value to replace it."
                        : undefined
                    }
                  >
                    <Input
                      id="smtp-pass"
                      type="password"
                      placeholder={hasSmtpPass ? "Enter new password to replace" : "SMTP password"}
                      value={editedSmtpPass ? (settings.smtpPass ?? "") : ""}
                      onChange={(e) => {
                        setEditedSmtpPass(true);
                        setSettings({ ...settings, smtpPass: e.target.value });
                      }}
                    />
                  </Field>
                </div>
              )}
            </CardContent>

            {settings.emailProvider ? (
              <CardFooter>
                <Button
                  type="button"
                  appearance="outline"
                  variant="primary"
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  loading={testingEmail}
                >
                  <Send aria-hidden />
                  {testingEmail ? "Sending..." : "Send Test Email"}
                </Button>
              </CardFooter>
            ) : null}
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <SectionHeading title="Files" className="flex-1" />
            </CardHeader>
            <CardContent>
              <div className="max-w-md space-y-2">
                <Label htmlFor="max-file-size">
                  Maximum File Size: {settings.maxFileSizeMb} MB
                </Label>
                <input
                  id="max-file-size"
                  type="range"
                  min={1}
                  max={500}
                  value={settings.maxFileSizeMb}
                  onChange={(e) =>
                    setSettings({ ...settings, maxFileSizeMb: parseInt(e.target.value, 10) })
                  }
                  className="h-2 w-full cursor-pointer accent-brand-500"
                />
                <div className="flex justify-between text-xs text-text-tertiary">
                  <span>1 MB</span>
                  <span>500 MB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <SectionHeading title="Error Reporting" className="flex-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="max-w-2xl text-sm leading-5 text-text-tertiary">
                Share anonymous crash reports and error data with the Freelancey team to help fix bugs and improve the product. No personal data or client information is ever included.
              </p>
              <Checkbox
                id="telemetry-enabled"
                checked={settings.telemetryEnabled === true}
                onChange={(e) => handleTelemetryToggle(e.target.checked)}
                label={
                  settings.telemetryEnabled === true
                    ? "Anonymous error reporting is enabled"
                    : settings.telemetryEnabled === false
                      ? "Anonymous error reporting is disabled"
                      : "Enable anonymous error reporting"
                }
              />
            </CardContent>
          </Card>
        </section>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={saving} loading={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>

      <section>
        <Card>
          <CardHeader>
            <SectionHeading
              title="Custom Domain"
              description="Let your clients access the portal at your own domain (e.g. portal.yourcompany.com)."
              className="flex-1"
            />
          </CardHeader>
          <CardContent>
            <CustomDomainSection />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
