"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Mail, Send } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  Input,
} from "@/components/ui";

interface StepEmailConfigProps {
  onNext: () => void;
  onBack: () => void;
}

type Provider = "none" | "resend" | "smtp";

export function StepEmailConfig({ onNext, onBack }: StepEmailConfigProps) {
  const [provider, setProvider] = useState<Provider>("none");
  const [resendApiKey, setResendApiKey] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [fromEmail, setFromEmail] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSendTest = async () => {
    if (!testEmail) return;
    setTestStatus("sending");
    setTestMessage("");
    try {
      const result = await apiFetch<{ success: boolean; message?: string }>(
        "/setup/test-email",
        {
          method: "POST",
          body: JSON.stringify({ to: testEmail }),
        },
      );
      if (result.success) {
        setTestStatus("success");
        setTestMessage("Test email sent successfully");
      } else {
        setTestStatus("error");
        setTestMessage(result.message || "Failed to send test email");
      }
    } catch (err) {
      setTestStatus("error");
      setTestMessage(
        err instanceof Error ? err.message : "Failed to send test email",
      );
    }
  };

  const handleNext = async () => {
    if (provider === "none") {
      onNext();
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { provider, fromEmail };
      if (provider === "resend") {
        payload.resendApiKey = resendApiKey;
      } else if (provider === "smtp") {
        payload.smtpHost = smtpHost;
        payload.smtpPort = parseInt(smtpPort, 10);
        payload.smtpUser = smtpUser;
        payload.smtpPass = smtpPass;
        payload.smtpSecure = smtpSecure;
      }

      await apiFetch("/setup/email", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Email Configuration</CardTitle>
          <CardDescription>
            Configure email delivery for sending invitations and notifications.
            You can skip this step and set it up later via environment variables.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && <Alert status="error">{error}</Alert>}

        {/* Provider selector */}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-input-label-text-color">
            Email Provider
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                {
                  value: "none",
                  label: "Skip for now",
                  desc: "Configure later",
                },
                {
                  value: "resend",
                  label: "Resend",
                  desc: "Simple email API",
                },
                {
                  value: "smtp",
                  label: "SMTP",
                  desc: "Any SMTP server",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={provider === opt.value}
                onClick={() => setProvider(opt.value)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-button-primary-focus-ring",
                  provider === opt.value
                    ? "border-input-primary-focus-border bg-background-gray-secondary_alt_2"
                    : "border-card-border bg-card-background hover:bg-background-gray-secondary_alt_2",
                )}
              >
                <span className="flex items-center gap-2 text-text-primary">
                  <Mail className="size-4 text-icon-tertiary" aria-hidden />
                  <span className="text-sm font-medium">{opt.label}</span>
                </span>
                <span className="mt-1 block text-xs text-text-tertiary">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Resend config */}
        {provider === "resend" && (
          <div className="space-y-4 rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2 p-4">
            <Field label="Resend API Key" htmlFor="setup-resend-key">
              <Input
                id="setup-resend-key"
                type="password"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder="re_..."
                className="font-mono text-xs"
              />
            </Field>
            <Field label="From Email" htmlFor="setup-from-email">
              <Input
                id="setup-from-email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
            </Field>
          </div>
        )}

        {/* SMTP config */}
        {provider === "smtp" && (
          <div className="space-y-4 rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="SMTP Host" htmlFor="setup-smtp-host">
                <Input
                  id="setup-smtp-host"
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.example.com"
                />
              </Field>
              <Field label="Port" htmlFor="setup-smtp-port">
                <Input
                  id="setup-smtp-port"
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Username" htmlFor="setup-smtp-user">
                <Input
                  id="setup-smtp-user"
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="user@example.com"
                />
              </Field>
              <Field label="Password" htmlFor="setup-smtp-pass">
                <Input
                  id="setup-smtp-pass"
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                />
              </Field>
            </div>
            <Checkbox
              id="setup-smtp-secure"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
              label="Use SSL/TLS"
            />
            <Field label="From Email" htmlFor="setup-smtp-from-email">
              <Input
                id="setup-smtp-from-email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
              />
            </Field>
          </div>
        )}

        {/* Test Email */}
        {provider !== "none" && (
          <div className="space-y-4 rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2 p-4">
            <Field label="Send Test Email" htmlFor="setup-test-email">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="setup-test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="primary"
                  appearance="outline"
                  onClick={handleSendTest}
                  disabled={testStatus === "sending" || !testEmail}
                >
                  <Send aria-hidden />
                  {testStatus === "sending" ? "Sending..." : "Send Test"}
                </Button>
              </div>
            </Field>
            {testStatus === "success" && (
              <Alert status="success">{testMessage}</Alert>
            )}
            {testStatus === "error" && <Alert status="error">{testMessage}</Alert>}
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-between">
        <Button appearance="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          {provider !== "none" && (
            <Button appearance="outline" onClick={onNext}>
              Skip
            </Button>
          )}
          <Button onClick={handleNext} loading={saving}>
            {saving
              ? "Saving..."
              : provider === "none"
                ? "Skip & Continue"
                : "Continue"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
