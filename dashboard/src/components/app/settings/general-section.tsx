"use client";

import { ActionButton, CheckInput, FormGrid, Loading, Notice, Panel, SelectInput, SwitchInput, TextInput } from "@/components/app/kit";
import { CustomDomainSection } from "@/components/app/settings/custom-domain-section";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

const DEFAULTS: SystemSettings = {
  emailProvider: null,
  emailFrom: null,
  resendApiKey: null,
  smtpHost: null,
  smtpPort: 587,
  smtpUser: null,
  smtpPass: null,
  smtpSecure: false,
  maxFileSizeMb: 50,
  setupCompleted: false,
  telemetryEnabled: null,
};

export function GeneralSection() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [editedApiKey, setEditedApiKey] = useState(false);
  const [editedSmtpPass, setEditedSmtpPass] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasSmtpPass, setHasSmtpPass] = useState(false);

  useEffect(() => {
    apiFetch<SystemSettings>("/settings")
      .then((data) => {
        setHasApiKey(!!data.resendApiKey);
        setHasSmtpPass(!!data.smtpPass);
        setSettings(data);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
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
      const updated = await apiFetch<SystemSettings>("/settings", { method: "PUT", body: JSON.stringify(payload) });
      setSettings(updated);
      setHasApiKey(!!updated.resendApiKey);
      setHasSmtpPass(!!updated.smtpPass);
      setEditedApiKey(false);
      setEditedSmtpPass(false);
      toast.success("Configuration saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTelemetry(enabled: boolean) {
    try {
      const updated = await apiFetch<SystemSettings>("/settings", { method: "PATCH", body: JSON.stringify({ telemetryEnabled: enabled }) });
      setSettings((p) => ({ ...p, telemetryEnabled: updated.telemetryEnabled }));
      toast.success(enabled ? "Error reporting enabled" : "Error reporting disabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update telemetry setting");
    }
  }

  async function testEmail() {
    setTesting(true);
    try {
      const result = await apiFetch<{ success: boolean; message: string }>("/settings/test-email", { method: "POST" });
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test email");
    } finally {
      setTesting(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <div className="space-y-5">
      <form onSubmit={save} className="space-y-5">
        <Panel title="Email" description="Configure how Gigly sends emails (invitations, password resets, etc.)">
          <div className="space-y-4">
            <FormGrid>
              <SelectInput
                label="Email Provider"
                value={settings.emailProvider ?? ""}
                onChange={(v) => setSettings({ ...settings, emailProvider: v || null })}
                options={[
                  { value: "", label: "None (disabled)" },
                  { value: "resend", label: "Resend" },
                  { value: "smtp", label: "SMTP" },
                ]}
              />
              <TextInput
                label="From Email"
                type="email"
                placeholder="noreply@example.com"
                hint="The sender address for outgoing emails."
                value={settings.emailFrom ?? ""}
                onChange={(v) => setSettings({ ...settings, emailFrom: v })}
              />
            </FormGrid>

            {settings.emailProvider === "resend" && (
              <TextInput
                label="Resend API Key"
                type="password"
                placeholder={hasApiKey && !editedApiKey ? "Key saved. Type to replace." : "re_..."}
                value={editedApiKey ? (settings.resendApiKey ?? "") : ""}
                onChange={(v) => {
                  setEditedApiKey(true);
                  setSettings({ ...settings, resendApiKey: v });
                }}
              />
            )}

            {settings.emailProvider === "smtp" && (
              <div className="space-y-4">
                <FormGrid>
                  <TextInput label="SMTP Host" value={settings.smtpHost ?? ""} onChange={(v) => setSettings({ ...settings, smtpHost: v })} />
                  <TextInput
                    label="Port"
                    type="number"
                    value={settings.smtpPort ?? ""}
                    onChange={(v) => setSettings({ ...settings, smtpPort: v ? parseInt(v, 10) : null })}
                  />
                  <TextInput label="Username" value={settings.smtpUser ?? ""} onChange={(v) => setSettings({ ...settings, smtpUser: v })} />
                  <TextInput
                    label="Password"
                    type="password"
                    placeholder={hasSmtpPass && !editedSmtpPass ? "Password saved. Type to replace." : ""}
                    value={editedSmtpPass ? (settings.smtpPass ?? "") : ""}
                    onChange={(v) => {
                      setEditedSmtpPass(true);
                      setSettings({ ...settings, smtpPass: v });
                    }}
                  />
                </FormGrid>
                <CheckInput checked={settings.smtpSecure} onChange={(v) => setSettings({ ...settings, smtpSecure: v })} label="Use TLS/SSL" />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <ActionButton type="submit" variant="primary" loading={saving}>
                {saving ? "Saving..." : "Save"}
              </ActionButton>
              {settings.emailProvider && (
                <ActionButton appearance="outline" variant="primary" loading={testing} onPress={testEmail}>
                  Send test email
                </ActionButton>
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Files" description="Upload limits for this workspace.">
          <div className="max-w-xs space-y-4">
            <TextInput
              label="Maximum file size (MB)"
              type="number"
              min={1}
              value={settings.maxFileSizeMb}
              onChange={(v) => setSettings({ ...settings, maxFileSizeMb: parseInt(v || "1", 10) })}
            />
            <ActionButton type="submit" variant="primary" loading={saving}>
              Save
            </ActionButton>
          </div>
        </Panel>
      </form>

      <Panel title="Error reporting" description="Share anonymous crash reports and error data with the Gigly team to help fix bugs. No personal data or client information is included.">
        <SwitchInput
          label="Share anonymous error reports"
          checked={settings.telemetryEnabled === true}
          onChange={toggleTelemetry}
        />
      </Panel>

      <CustomDomainSection />
      <Notice status="info">Email settings apply to the whole workspace.</Notice>
    </div>
  );
}
