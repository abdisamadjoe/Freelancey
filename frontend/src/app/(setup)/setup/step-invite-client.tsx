"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { UserPlus, Copy, Check } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from "@/components/ui";

interface StepInviteClientProps {
  onNext: () => void;
  onBack: () => void;
}

export function StepInviteClient({ onNext, onBack }: StepInviteClientProps) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [invited, setInvited] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/clients/invitations", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), role: "member" }),
      });
      setInvited(true);

      // Try to get the invite link
      try {
        const invitations = await apiFetch<
          Array<{ email: string; inviteLink: string }>
        >("/clients/invitations");
        const newest = invitations.find(
          (inv) =>
            inv.email === email.trim().toLowerCase() ||
            inv.email === email.trim(),
        );
        if (newest) {
          setInviteLink(newest.inviteLink);
        }
      } catch {
        // Invite link retrieval is best-effort
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Invite a Client</CardTitle>
          <CardDescription>
            Send an invitation to your first client. They will get access to the
            client portal where they can view project progress and download files.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && <Alert status="error">{error}</Alert>}

        {!invited ? (
          <div className="space-y-4 rounded-lg border-[0.5px] border-card-border bg-background-gray-secondary_alt_2 p-5">
            <div className="flex items-center gap-2">
              <UserPlus className="size-4.5 text-icon-tertiary" aria-hidden />
              <span className="text-sm font-medium text-text-primary">
                Client Invitation
              </span>
            </div>

            <Field label="Client Email" htmlFor="setup-client-email">
              <Input
                id="setup-client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </Field>

            <Button onClick={handleInvite} loading={saving}>
              <UserPlus aria-hidden />
              {saving ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        ) : (
          <Alert status="success" icon={<Check />}>
            <div className="space-y-3">
              <p className="text-sm font-medium text-alert-success-title">
                Invitation sent to {email}
              </p>
              {inviteLink && (
                <div className="space-y-2">
                  <p className="text-xs text-text-tertiary">
                    Share this invite link with your client:
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={inviteLink}
                      aria-label="Invite link"
                      className="flex-1 font-mono text-xs"
                    />
                    <Button
                      appearance="outline"
                      size="sm"
                      onClick={copyLink}
                      className="shrink-0"
                    >
                      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="justify-between">
        <Button appearance="outline" onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          {!invited && (
            <Button appearance="outline" onClick={onNext}>
              Skip
            </Button>
          )}
          <Button onClick={onNext}>Continue</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
