"use client";

import { ColorField } from "@/components/app/color-field";
import { ActionButton, CheckInput, FormGrid, Loading, Notice, PageHeader, Panel, TextAreaInput, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { Progress } from "@/components/tailgrids/core/progress";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/track";
import { cn } from "@/utils/cn";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

const ALL_STEPS = [
  { key: "org", label: "Organization" },
  { key: "email", label: "Email" },
  { key: "project", label: "First Project" },
  { key: "invite", label: "Invite Client" },
  { key: "complete", label: "Complete" },
] as const;

interface Branding {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  logoKey?: string;
  organizationId?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function StepOrg({ orgName, onNext }: { orgName: string; onNext: () => void }) {
  const [name, setName] = useState(orgName);
  const [branding, setBranding] = useState<Branding>({ primaryColor: "#665df5", accentColor: "#ff6b5c" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [bust, setBust] = useState(() => Date.now());

  useEffect(() => {
    apiFetch<Branding>("/branding").then(setBranding).catch(() => {});
  }, []);

  const logoSrc = branding.logoKey ? `${API_URL}/api/branding/logo/${branding.organizationId}?v=${bust}` : branding.logoUrl || null;

  async function uploadLogo(file: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const updated = await apiFetch<Branding>("/branding/logo", { method: "POST", body: fd });
      setBranding((b) => ({ ...b, ...updated }));
      setBust(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploading(false);
    }
  }

  async function removeLogo() {
    try {
      const updated = await apiFetch<Branding>("/branding/logo", { method: "DELETE" });
      setBranding((b) => ({ ...b, ...updated }));
      setBust(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove logo");
    }
  }

  async function next() {
    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/organizations/current", { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
      await apiFetch("/branding", {
        method: "PUT",
        body: JSON.stringify({ primaryColor: branding.primaryColor, accentColor: branding.accentColor }),
      });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Organization Profile" description="Your company name, logo and brand colours appear in the client portal.">
      <div className="space-y-5">
        {error && <Notice status="error">{error}</Notice>}
        <TextInput label="Organization Name" required value={name} onChange={setName} />
        <div className="space-y-2">
          <span className="text-sm font-medium text-input-label-text">Company Logo</span>
          <p className="text-xs text-text-tertiary">PNG, JPEG, SVG, or WebP. Max 2MB.</p>
          <div className="flex flex-wrap items-center gap-3">
            {logoSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="Current logo" className="h-12 w-auto rounded-md border border-card-border object-contain" />
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
        <div className="flex justify-end">
          <ActionButton variant="primary" loading={saving} onPress={next}>
            {saving ? "Saving..." : "Continue"}
          </ActionButton>
        </div>
      </div>
    </Panel>
  );
}

function StepEmail({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [provider, setProvider] = useState<"none" | "resend" | "smtp">("none");
  const [resendApiKey, setResendApiKey] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [fromEmail, setFromEmail] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function sendTest() {
    if (!testEmail) return;
    setTestStatus("sending");
    setTestMessage("");
    try {
      const result = await apiFetch<{ success: boolean; message?: string }>("/setup/test-email", {
        method: "POST",
        body: JSON.stringify({ to: testEmail }),
      });
      setTestStatus(result.success ? "success" : "error");
      setTestMessage(result.success ? "Test email sent successfully" : result.message || "Failed to send test email");
    } catch (err) {
      setTestStatus("error");
      setTestMessage(err instanceof Error ? err.message : "Failed to send test email");
    }
  }

  async function next() {
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
      } else {
        payload.smtpHost = smtpHost;
        payload.smtpPort = parseInt(smtpPort, 10);
        payload.smtpUser = smtpUser;
        payload.smtpPass = smtpPass;
        payload.smtpSecure = smtpSecure;
      }
      await apiFetch("/setup/email", { method: "PUT", body: JSON.stringify(payload) });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const options = [
    { value: "none", label: "Skip for now", desc: "Configure later" },
    { value: "resend", label: "Resend", desc: "Simple email API" },
    { value: "smtp", label: "SMTP", desc: "Any SMTP server" },
  ] as const;

  return (
    <Panel
      title="Email Configuration"
      description="Configure email delivery for sending invitations and notifications. You can skip this step and set it up later via environment variables."
    >
      <div className="space-y-5">
        {error && <Notice status="error">{error}</Notice>}
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-input-label-text">Email Provider</span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={provider === opt.value}
                onClick={() => setProvider(opt.value)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  provider === opt.value
                    ? "border-input-primary-focus-border bg-background-gray-secondary_alt_2"
                    : "border-card-border bg-card-background hover:bg-background-gray-secondary_alt_2",
                )}
              >
                <span className="block text-sm font-medium text-text-primary">{opt.label}</span>
                <span className="mt-1 block text-xs text-text-tertiary">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {provider === "resend" && (
          <div className="space-y-4 rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2 p-4">
            <TextInput label="Resend API Key" type="password" value={resendApiKey} onChange={setResendApiKey} placeholder="re_..." />
            <TextInput label="From Email" type="email" value={fromEmail} onChange={setFromEmail} placeholder="noreply@yourdomain.com" />
          </div>
        )}

        {provider === "smtp" && (
          <div className="space-y-4 rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2 p-4">
            <FormGrid>
              <TextInput label="SMTP Host" value={smtpHost} onChange={setSmtpHost} placeholder="smtp.example.com" />
              <TextInput label="Port" type="number" value={smtpPort} onChange={setSmtpPort} placeholder="587" />
              <TextInput label="Username" value={smtpUser} onChange={setSmtpUser} placeholder="user@example.com" />
              <TextInput label="Password" type="password" value={smtpPass} onChange={setSmtpPass} />
            </FormGrid>
            <CheckInput checked={smtpSecure} onChange={setSmtpSecure} label="Use SSL/TLS" />
            <TextInput label="From Email" type="email" value={fromEmail} onChange={setFromEmail} placeholder="noreply@yourdomain.com" />
          </div>
        )}

        {provider !== "none" && (
          <div className="space-y-3 rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <TextInput label="Send Test Email" type="email" value={testEmail} onChange={setTestEmail} placeholder="your-email@example.com" />
              </div>
              <ActionButton appearance="outline" variant="primary" loading={testStatus === "sending"} isDisabled={!testEmail} onPress={sendTest}>
                Send Test
              </ActionButton>
            </div>
            {testStatus === "success" && <Notice status="success">{testMessage}</Notice>}
            {testStatus === "error" && <Notice status="error">{testMessage}</Notice>}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button appearance="outline" variant="primary" onPress={onBack}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            {provider !== "none" && (
              <Button appearance="outline" variant="primary" onPress={onNext}>
                Skip
              </Button>
            )}
            <ActionButton variant="primary" loading={saving} onPress={next}>
              {saving ? "Saving..." : provider === "none" ? "Skip & Continue" : "Continue"}
            </ActionButton>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function StepProject({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (!name.trim()) {
      onNext();
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Create Your First Project"
      description="Projects are how you organize work for your clients. You can always create more later."
    >
      <div className="space-y-5">
        {error && <Notice status="error">{error}</Notice>}
        <TextInput label="Project Name" value={name} onChange={setName} placeholder="e.g. Website Redesign" />
        <TextAreaInput label="Description (optional)" rows={3} value={description} onChange={setDescription} />
        <div className="flex items-center justify-between">
          <Button appearance="outline" variant="primary" onPress={onBack}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button appearance="outline" variant="primary" onPress={onNext}>
              Skip
            </Button>
            <ActionButton variant="primary" loading={saving} isDisabled={!name.trim()} onPress={create}>
              {saving ? "Creating..." : "Create & Continue"}
            </ActionButton>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function StepInvite({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [invited, setInvited] = useState(false);

  async function invite() {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/clients/invitations", { method: "POST", body: JSON.stringify({ email: email.trim(), role: "member" }) });
      setInvited(true);
      try {
        const invitations = await apiFetch<{ email: string; inviteLink: string }[]>("/clients/invitations");
        const mine = invitations.find((i) => i.email === email.trim().toLowerCase() || i.email === email.trim());
        if (mine) setInviteLink(mine.inviteLink);
      } catch {
        // Invite link retrieval is best-effort
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Invite a Client"
      description="Send an invitation to your first client. They will get access to the client portal where they can view project progress and download files."
    >
      <div className="space-y-5">
        {error && <Notice status="error">{error}</Notice>}
        {!invited ? (
          <div className="space-y-4 rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2 p-5">
            <TextInput label="Client Email" type="email" value={email} onChange={setEmail} placeholder="client@example.com" />
            <ActionButton variant="primary" loading={saving} onPress={invite}>
              {saving ? "Sending..." : "Send Invitation"}
            </ActionButton>
          </div>
        ) : (
          <Notice status="success">
            Invitation sent to {email.trim()}.
            {inviteLink && (
              <>
                {" "}
                Share this link too: <code className="text-xs break-all">{inviteLink}</code>{" "}
                <button type="button" className="font-medium underline" onClick={() => navigator.clipboard.writeText(inviteLink).then(() => toast.success("Link copied"))}>
                  Copy
                </button>
              </>
            )}
          </Notice>
        )}
        <div className="flex items-center justify-between">
          <Button appearance="outline" variant="primary" onPress={onBack}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            {!invited && (
              <Button appearance="outline" variant="primary" onPress={onNext}>
                Skip
              </Button>
            )}
            {invited && (
              <Button variant="primary" onPress={onNext}>
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function StepComplete({ onBack }: { onBack: () => void }) {
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
    setCompleting(true);
    setError("");
    try {
      await apiFetch("/setup/complete", { method: "POST" });
      track("setup_completed");
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete setup");
      setCompleting(false);
    }
  }

  const next = [
    ["Create projects", "and assign clients to give them portal access."],
    ["Upload files", "to projects that clients can download from their portal."],
    ["Post updates", "to keep your clients informed about project progress."],
  ];

  return (
    <Panel
      title="You are all set!"
      description="Your Freelancey instance is configured and ready to use. You can always adjust these settings later from the dashboard."
    >
      <div className="space-y-5">
        {error && <Notice status="error">{error}</Notice>}
        <div className="space-y-3 rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2 p-5">
          <p className="text-sm font-medium text-text-primary">What you can do next</p>
          <ul className="space-y-3">
            {next.map(([title, description], i) => (
              <li key={title} className="flex items-start gap-3 text-sm">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background-gray-tertiary text-xs font-medium">{i + 1}</span>
                <span className="text-text-secondary">
                  <span className="font-medium text-text-primary">{title}</span> {description}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between">
          <Button appearance="outline" variant="primary" onPress={onBack}>
            Back
          </Button>
          <ActionButton variant="primary" loading={completing} onPress={finish}>
            {completing ? "Finishing..." : "Go to Launchpad"}
          </ActionButton>
        </div>
      </div>
    </Panel>
  );
}

function SetupWizardContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [emailPreConfigured, setEmailPreConfigured] = useState(false);
  const [banner, setBanner] = useState<"success" | "cancelled" | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success" || checkout === "cancelled") {
      setBanner(checkout);
      window.history.replaceState({}, "", "/setup");
    }
  }, [searchParams]);

  useEffect(() => {
    let redirecting = false;
    const status = apiFetch<{ completed: boolean; emailConfigured?: boolean }>("/setup/status")
      .then((res) => {
        if (res.completed) {
          redirecting = true;
          window.location.href = "/dashboard";
          return;
        }
        if (res.emailConfigured) setEmailPreConfigured(true);
      })
      .catch(() => {});
    const org = apiFetch<{ organization: { name?: string } }>("/organizations/me")
      .then((s) => {
        if (s.organization.name) setOrgName(s.organization.name);
      })
      .catch(() => {});
    // Wait for both so the wizard never renders with a not-yet-loaded org name.
    Promise.all([status, org]).then(() => {
      if (!redirecting) setLoading(false);
    });
  }, []);

  if (loading) return <Loading label="Loading…" />;

  const steps = emailPreConfigured ? ALL_STEPS.filter((s) => s.key !== "email") : ALL_STEPS;
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const key = steps[step]?.key;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {banner && (
        <Notice status={banner === "success" ? "success" : "warning"}>
          {banner === "success"
            ? "Payment successful! Your plan has been upgraded."
            : "Checkout was cancelled. You’re on the Free plan — you can upgrade anytime from Settings."}
        </Notice>
      )}

      <PageHeader title="Welcome to Freelancey" description="Let's get your client portal set up in a few quick steps." />

      <Panel>
        <div className="space-y-4">
          <p className="text-xs font-semibold text-text-secondary">
            Step {step + 1} of {steps.length}
          </p>
          <Progress className="max-w-none" progress={((step + 1) / steps.length) * 100} />
          <ol className="flex items-center">
            {steps.map((s, index) => (
              <li key={s.key} className="flex flex-1 items-center last:flex-none">
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                      index < step
                        ? "bg-badge-success-background text-badge-success-text"
                        : index === step
                          ? "bg-button-primary-background text-button-primary-text"
                          : "bg-background-gray-secondary text-text-tertiary",
                    )}
                  >
                    {index < step ? "✓" : index + 1}
                  </span>
                  <span className={cn("hidden text-sm whitespace-nowrap sm:inline", index === step ? "font-medium text-text-primary" : "text-text-tertiary")}>
                    {s.label}
                  </span>
                </span>
                {index < steps.length - 1 && (
                  <span aria-hidden className={cn("mx-3 h-px min-w-3 flex-1", index < step ? "bg-success-500" : "bg-background-gray-tertiary")} />
                )}
              </li>
            ))}
          </ol>
        </div>
      </Panel>

      <div>
        {key === "org" && <StepOrg orgName={orgName} onNext={next} />}
        {key === "email" && <StepEmail onNext={next} onBack={back} />}
        {key === "project" && <StepProject onNext={next} onBack={back} />}
        {key === "invite" && <StepInvite onNext={next} onBack={back} />}
        {key === "complete" && <StepComplete onBack={back} />}
      </div>
    </div>
  );
}

export default function SetupWizardPage() {
  return (
    <Suspense>
      <SetupWizardContent />
    </Suspense>
  );
}
