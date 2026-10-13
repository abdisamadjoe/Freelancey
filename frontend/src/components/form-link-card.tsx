"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Copy, Eye, Send } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Alert, Badge, Button, Card, CardHeader, CardTitle, Checkbox } from "@/components/ui";
import type { FormAnswers, FormKind, FormLinkSummary } from "@/lib/form-links";

interface Props {
  clientId: string;
  kind: FormKind;
  /** Required for a project brief. */
  projectId?: string;
  hasEmail: boolean;
}

const COPY = {
  onboarding: {
    title: "Client onboarding",
    incomplete: "Client onboarding incomplete",
    pending: "Waiting for the client to fill in the form.",
    send: "Send client onboarding form",
    done: "Onboarding completed",
    help: "Tell me about your business: audience, goals, branding and requirements.",
  },
  project_brief: {
    title: "Project brief",
    incomplete: "Project requirements haven't been completed",
    pending: "Waiting for the client to fill in the brief.",
    send: "Send project brief",
    done: "Project brief completed",
    help: "Tell me about this project: goals, pages, features, integrations and success criteria.",
  },
} as const;

/** Sends a secure form link to the client and shows whether they have filled it in. Staff only. */
export function FormLinkCard({ clientId, kind, projectId, hasEmail }: Props) {
  const { success, error: showError } = useToast();
  const copy = COPY[kind];
  const [link, setLink] = useState<FormLinkSummary | null | undefined>(undefined);
  const [url, setUrl] = useState("");
  const [emailIt, setEmailIt] = useState(hasEmail);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<FormAnswers | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ clientId, kind });
      if (projectId) params.set("projectId", projectId);
      const rows = await apiFetch<FormLinkSummary[]>(`/form-links?${params}`);
      setLink(rows[0] ?? null);
    } catch {
      setLink(null);
    }
  }, [clientId, kind, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    setBusy(true);
    try {
      const res = await apiFetch<{ link: string; emailed: boolean }>("/form-links", {
        method: "POST",
        body: JSON.stringify({ clientId, kind, projectId, email: emailIt && hasEmail }),
      });
      setUrl(res.link);
      await load();
      success(res.emailed ? "Form emailed" : "Form link ready to share");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not create the link");
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      success("Link copied");
    } catch {
      showError("Copy failed. Select the link and copy it by hand.");
    }
  }

  async function viewAnswers() {
    if (!link) return;
    try {
      setAnswers(await apiFetch<FormAnswers>(`/form-links/${link.id}/answers`));
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not load the answers");
    }
  }

  if (link === undefined) return null;
  const completed = link?.status === "completed";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{copy.title}</CardTitle>
        {completed ? (
          <Badge color="success">Completed</Badge>
        ) : link ? (
          <Badge color={link.status === "expired" ? "orange" : "blue"}>{link.status === "expired" ? "Link expired" : "Pending"}</Badge>
        ) : (
          <Badge color="gray">Not sent</Badge>
        )}
      </CardHeader>
      <div className="space-y-4 p-5 pt-0">
        {completed ? (
          <>
            <Alert status="success" title={`${copy.done}`}>
              {link?.completedAt ? `Submitted ${new Date(link.completedAt).toLocaleDateString()}.` : null}
            </Alert>
            <Button size="sm" appearance="outline" iconOnly={false} onClick={viewAnswers}>
              <Eye />
              <span>View answers</span>
            </Button>
            {answers && (
              <dl className="divide-y divide-card-border rounded-md border border-card-border">
                {answers.fields
                  .filter((f) => answers.answers[f.key])
                  .map((f) => (
                    <div key={f.key} className="px-4 py-3">
                      <dt className="text-xs font-medium text-text-tertiary">{f.label}</dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-text-primary">{answers.answers[f.key]}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </>
        ) : (
          <>
            <Alert status="warning" title={copy.incomplete}>
              {link && link.status === "pending" ? copy.pending : copy.help}
            </Alert>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" iconOnly={false} loading={busy} onClick={send}>
                <Send />
                <span>{link ? "Send a new link" : copy.send}</span>
              </Button>
              {hasEmail ? (
                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <Checkbox checked={emailIt} onChange={() => setEmailIt((v) => !v)} aria-label="Email the link" />
                  Email it to the client
                </label>
              ) : (
                <span className="text-sm text-text-tertiary">No email on file. You will get a link to share.</span>
              )}
            </div>
            {url && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-card-border p-3">
                <ClipboardCheck className="size-4 text-text-tertiary" aria-hidden />
                <code className="min-w-0 flex-1 break-all text-xs text-text-primary">{url}</code>
                <Button type="button" size="sm" appearance="outline" iconOnly={false} onClick={copyUrl}>
                  <Copy />
                  <span>Copy link</span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
