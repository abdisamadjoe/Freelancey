"use client";

import { ActionButton, CheckInput, ErrorNote, fmtDateTime, Loading, Page, PageBody, PageHeader, Panel, SelectInput, StatusBadge, TextAreaInput } from "@/components/app/kit";
import { apiFetch } from "@/lib/api";
import { TICKET_PRIORITY_OPTIONS, TICKET_STATUS_COLOR, TICKET_STATUS_OPTIONS, type TicketDetail } from "@/lib/support";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const [emailIt, setEmailIt] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      setTicket(await apiFetch<TicketDetail>(`/support-tickets/${id}`));
    } catch (err) {
      setLoadError(err);
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
      toast.error(err instanceof Error ? err.message : "Could not update the ticket");
    }
  }

  async function reply() {
    setSending(true);
    try {
      const res = await apiFetch<{ emailed: boolean }>(`/support-tickets/${id}/replies`, {
        method: "POST",
        body: JSON.stringify({ message, email: emailIt }),
      });
      setMessage("");
      toast.success(res.emailed ? "Reply sent and emailed" : "Reply saved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the reply");
    } finally {
      setSending(false);
    }
  }

  if (loadError) {
    return (
      <Page>
        <PageBody>
          <ErrorNote error={loadError} />
          <Link href="/dashboard/support" className="text-sm text-neutral-brand-color hover:underline">
            Back to support
          </Link>
        </PageBody>
      </Page>
    );
  }
  if (!ticket) return <Loading />;

  const replyTo = ticket.client.email ?? ticket.submittedByEmail;

  return (
    <Page>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {ticket.subject}
            <StatusBadge color={TICKET_STATUS_COLOR[ticket.status] ?? "gray"}>
              {TICKET_STATUS_OPTIONS.find((o) => o.value === ticket.status)?.label ?? ticket.status}
            </StatusBadge>
          </span>
        }
        description={
          <>
            <Link href="/dashboard/support" className="text-neutral-brand-color hover:underline">
              Support
            </Link>{" "}
            · {ticket.client.company || ticket.client.name}
            {ticket.projectName ? ` · ${ticket.projectName}` : ""}
          </>
        }
        actions={
          <>
            <div className="w-36">
              <SelectInput value={ticket.status} onChange={(v) => patch({ status: v })} options={TICKET_STATUS_OPTIONS} />
            </div>
            <div className="w-32">
              <SelectInput value={ticket.priority} onChange={(v) => patch({ priority: v })} options={TICKET_PRIORITY_OPTIONS} />
            </div>
          </>
        }
      />
      <PageBody>
        <Panel title="Request">
          <div className="space-y-2">
            <p className="text-sm whitespace-pre-wrap text-text-primary">{ticket.message}</p>
            <p className="text-xs text-text-tertiary">
              {ticket.source === "staff"
                ? "Logged by you"
                : `From ${ticket.submittedByName ?? ticket.client.name}${ticket.submittedByEmail ? ` (${ticket.submittedByEmail})` : ""}`}{" "}
              · {fmtDateTime(ticket.createdAt)}
            </p>
            <Link href={`/dashboard/leads/${ticket.client.id}`} className="text-sm text-neutral-brand-color hover:underline">
              Open client
            </Link>
          </div>
        </Panel>

        {ticket.replies.length > 0 && (
          <Panel title="Replies" flush>
            <ul className="mt-4 divide-y divide-card-border border-t border-card-border">
              {ticket.replies.map((r) => (
                <li key={r.id} className="px-5 py-3">
                  <p className="text-xs text-text-tertiary">
                    {r.authorName ?? (r.authorKind === "staff" ? "You" : "Client")} · {fmtDateTime(r.createdAt)}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-text-primary">{r.message}</p>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel>
          <div className="space-y-3">
            <TextAreaInput rows={4} value={message} onChange={setMessage} placeholder="Write a reply" />
            <div className="flex flex-wrap items-center gap-3">
              <ActionButton variant="primary" loading={sending} isDisabled={!message.trim()} onPress={reply}>
                Send reply
              </ActionButton>
              {replyTo ? (
                <CheckInput checked={emailIt} onChange={setEmailIt} label={`Email it to ${replyTo}`} />
              ) : (
                <span className="text-sm text-text-tertiary">No email on file, so this reply is saved here only.</span>
              )}
            </div>
          </div>
        </Panel>
      </PageBody>
    </Page>
  );
}
