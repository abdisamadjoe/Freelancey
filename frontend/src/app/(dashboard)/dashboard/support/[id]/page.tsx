"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Alert, Badge, Button, Card, CardHeader, CardTitle, Checkbox, NativeSelect, PageHeader, Textarea } from "@/components/ui";
import {
  TICKET_PRIORITY_OPTIONS,
  TICKET_STATUS_COLOR,
  TICKET_STATUS_OPTIONS,
  type TicketDetail,
} from "@/lib/support";

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const { success, error: showError } = useToast();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [emailIt, setEmailIt] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setTicket(await apiFetch<TicketDetail>(`/support-tickets/${id}`));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(body: Record<string, string>) {
    try {
      await apiFetch(`/support-tickets/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not update the ticket");
    }
  }

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await apiFetch<{ emailed: boolean }>(`/support-tickets/${id}/replies`, {
        method: "POST",
        body: JSON.stringify({ message, email: emailIt }),
      });
      setMessage("");
      success(res.emailed ? "Reply sent and emailed" : "Reply saved");
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not send the reply");
    } finally {
      setSending(false);
    }
  }

  if (loadError) {
    return (
      <div className="space-y-5">
        <Alert status="error">{loadError}</Alert>
        <Link href="/dashboard/support" className="text-sm text-neutral-brand-color hover:underline">
          Back to support
        </Link>
      </div>
    );
  }
  if (!ticket) return <p className="py-10 text-center text-sm text-text-tertiary">Loading...</p>;

  const replyTo = ticket.client.email ?? ticket.submittedByEmail;

  return (
    <div className="space-y-5">
      <Link href="/dashboard/support" className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        Support
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {ticket.subject}
            <Badge color={TICKET_STATUS_COLOR[ticket.status] ?? "gray"}>
              {TICKET_STATUS_OPTIONS.find((o) => o.value === ticket.status)?.label ?? ticket.status}
            </Badge>
          </span>
        }
        description={`${ticket.client.company || ticket.client.name}${ticket.projectName ? ` · ${ticket.projectName}` : ""}`}
        actions={
          <>
            <NativeSelect value={ticket.status} onChange={(e) => patch({ status: e.target.value })} aria-label="Status" className="h-9 w-36 py-0">
              {TICKET_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect value={ticket.priority} onChange={(e) => patch({ priority: e.target.value })} aria-label="Priority" className="h-9 w-32 py-0">
              {TICKET_PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Request</CardTitle>
        </CardHeader>
        <div className="space-y-2 p-5 pt-0">
          <p className="whitespace-pre-wrap text-sm text-text-primary">{ticket.message}</p>
          <p className="text-xs text-text-tertiary">
            {ticket.source === "staff" ? "Logged by you" : `From ${ticket.submittedByName ?? ticket.client.name}${ticket.submittedByEmail ? ` (${ticket.submittedByEmail})` : ""}`} ·{" "}
            {new Date(ticket.createdAt).toLocaleString()}
          </p>
          <Link href={`/dashboard/leads/${ticket.client.id}`} className="text-sm text-neutral-brand-color hover:underline">
            Open client
          </Link>
        </div>
      </Card>

      {ticket.replies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Replies</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-card-border border-t border-card-border">
            {ticket.replies.map((r) => (
              <li key={r.id} className="px-5 py-3">
                <p className="text-xs text-text-tertiary">
                  {r.authorName ?? (r.authorKind === "staff" ? "You" : "Client")} · {new Date(r.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{r.message}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <form onSubmit={reply} className="space-y-3 p-5">
          <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} aria-label="Reply" placeholder="Write a reply" />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" iconOnly={false} loading={sending} disabled={!message.trim()}>
              <Send />
              <span>Send reply</span>
            </Button>
            {replyTo ? (
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <Checkbox checked={emailIt} onChange={() => setEmailIt((v) => !v)} aria-label="Email the reply" />
                Email it to {replyTo}
              </label>
            ) : (
              <span className="text-sm text-text-tertiary">No email on file, so this reply is saved here only.</span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
