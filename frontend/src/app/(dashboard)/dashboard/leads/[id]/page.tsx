"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NativeSelect,
  PageHeader,
  Textarea,
} from "@/components/ui";
import {
  ACTIVITY_KIND_OPTIONS,
  type ClientActivity,
  type ClientRecord,
  LEAD_SOURCES,
  LEAD_STATUS_OPTIONS,
  isFollowUpDue,
  stageBadge,
  toDateInput,
} from "@/lib/leads";

interface ClientDetail extends ClientRecord {
  projects: { id: string; name: string; status: string; archivedAt: string | null }[];
  invoices: { id: string; invoiceNumber: string; status: string; dueDate: string | null }[];
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const blankToNull = (v: string) => (v.trim() ? v.trim() : null);

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { success, error: showError } = useToast();
  const [record, setRecord] = useState<ClientDetail | null>(null);
  const [activity, setActivity] = useState<ClientActivity[]>([]);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [f, setF] = useState({
    name: "", company: "", email: "", phone: "", whatsapp: "", website: "",
    source: "", interestedIn: "", budget: "", followUp: "", notes: "",
  });

  const [kind, setKind] = useState("note");
  const [summary, setSummary] = useState("");
  const [logging, setLogging] = useState(false);

  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");

  const hydrate = useCallback((r: ClientDetail) => {
    setRecord(r);
    setF({
      name: r.name,
      company: r.company ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      whatsapp: r.whatsapp ?? "",
      website: r.website ?? "",
      source: r.source ?? "",
      interestedIn: r.interestedIn ?? "",
      budget: r.estimatedBudgetCents != null ? String(r.estimatedBudgetCents / 100) : "",
      followUp: toDateInput(r.nextFollowUpAt),
      notes: r.notes ?? "",
    });
  }, []);

  const loadActivity = useCallback(async () => {
    const res = await apiFetch<Paginated<ClientActivity>>(`/client-records/${id}/activity?limit=50`);
    setActivity(res.data);
  }, [id]);

  useEffect(() => {
    apiFetch<ClientDetail>(`/client-records/${id}`)
      .then(hydrate)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load"));
    loadActivity().catch(() => {});
  }, [id, hydrate, loadActivity]);

  async function patch(body: Record<string, unknown>, okMessage?: string): Promise<boolean> {
    try {
      await apiFetch(`/client-records/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      const fresh = await apiFetch<ClientDetail>(`/client-records/${id}`);
      hydrate(fresh);
      await loadActivity();
      if (okMessage) success(okMessage);
      return true;
    } catch (err) {
      showError(err instanceof Error ? err.message : "Update failed");
      return false;
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const budget = f.budget.trim() ? Math.round(parseFloat(f.budget) * 100) : null;
    if (budget !== null && (Number.isNaN(budget) || budget < 0)) {
      setFormError("Budget must be a positive number.");
      return;
    }
    if (!f.email.trim() && !f.phone.trim() && !f.whatsapp.trim()) {
      setFormError("Keep at least one of email, phone or WhatsApp.");
      return;
    }
    setSaving(true);
    await patch(
      {
        name: f.name,
        company: blankToNull(f.company),
        email: blankToNull(f.email),
        phone: blankToNull(f.phone),
        whatsapp: blankToNull(f.whatsapp),
        website: blankToNull(f.website),
        source: blankToNull(f.source),
        interestedIn: blankToNull(f.interestedIn),
        estimatedBudgetCents: budget,
        nextFollowUpAt: f.followUp ? new Date(f.followUp).toISOString() : null,
        notes: blankToNull(f.notes),
      },
      "Saved",
    );
    setSaving(false);
  }

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;
    setLogging(true);
    try {
      await apiFetch(`/client-records/${id}/activity`, {
        method: "POST",
        body: JSON.stringify({ kind, summary }),
      });
      setSummary("");
      await loadActivity();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to log activity");
    } finally {
      setLogging(false);
    }
  }

  async function markLost(e: React.FormEvent) {
    e.preventDefault();
    if (await patch({ stage: "lost", lostReason }, "Marked as lost")) {
      setLostOpen(false);
      setLostReason("");
    }
  }

  if (loadError) {
    return (
      <div className="space-y-5">
        <Alert status="error">{loadError}</Alert>
        <Link href="/dashboard/leads" className="text-sm text-neutral-brand-color hover:underline">
          Back to leads
        </Link>
      </div>
    );
  }
  if (!record) return <p className="py-10 text-center text-sm text-text-tertiary">Loading...</p>;

  const badge = stageBadge(record);
  const isLead = record.stage === "lead";
  const due = isLead && isFollowUpDue(record.nextFollowUpAt);
  const set = (key: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-5">
      <Link href="/dashboard/leads" className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary">
        <ArrowLeft className="size-4" aria-hidden />
        Leads
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {record.name}
            <Badge color={badge.color}>{badge.label}</Badge>
            {due && <Badge color="error">Follow-up due</Badge>}
          </span>
        }
        description={record.company ?? undefined}
        actions={
          <>
            {isLead && (
              <>
                <NativeSelect
                  value={record.leadStatus ?? "new"}
                  onChange={(e) => patch({ leadStatus: e.target.value })}
                  aria-label="Lead status"
                  className="h-9 w-40 py-0"
                >
                  {LEAD_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
                <Button size="sm" iconOnly={false} onClick={() => patch({ stage: "active" }, "Marked as won")}>
                  <CheckCircle2 />
                  <span>Won</span>
                </Button>
                <Button size="sm" appearance="outline" iconOnly={false} onClick={() => setLostOpen(true)}>
                  <XCircle />
                  <span>Lost</span>
                </Button>
              </>
            )}
            {(record.stage === "lost" || record.stage === "past") && (
              <Button size="sm" appearance="outline" iconOnly={false} onClick={() => patch({ stage: "lead" }, "Reopened as a lead")}>
                <RotateCcw />
                <span>Reopen as lead</span>
              </Button>
            )}
          </>
        }
      />

      {record.stage === "lost" && record.lostReason && (
        <Alert status="warning" title="Lost">
          {record.lostReason}
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <form onSubmit={handleSave} className="space-y-4 p-5 pt-0">
            {formError && <Alert status="error">{formError}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="d-name" required>
                <Input id="d-name" value={f.name} onChange={set("name")} required maxLength={200} />
              </Field>
              <Field label="Company" htmlFor="d-company">
                <Input id="d-company" value={f.company} onChange={set("company")} />
              </Field>
              <Field label="Email" htmlFor="d-email">
                <Input id="d-email" type="email" value={f.email} onChange={set("email")} />
              </Field>
              <Field label="Phone" htmlFor="d-phone">
                <Input id="d-phone" value={f.phone} onChange={set("phone")} />
              </Field>
              <Field label="WhatsApp" htmlFor="d-wa">
                <Input id="d-wa" value={f.whatsapp} onChange={set("whatsapp")} />
              </Field>
              <Field label="Website" htmlFor="d-web">
                <Input id="d-web" value={f.website} onChange={set("website")} />
              </Field>
              <Field label="Source" htmlFor="d-source">
                <NativeSelect id="d-source" value={f.source} onChange={set("source")}>
                  <option value="">Not sure</option>
                  {[...new Set([...(f.source ? [f.source] : []), ...LEAD_SOURCES])].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Interested in" htmlFor="d-interest">
                <Input id="d-interest" value={f.interestedIn} onChange={set("interestedIn")} />
              </Field>
              <Field label="Estimated budget" htmlFor="d-budget">
                <Input id="d-budget" type="number" min="0" step="0.01" value={f.budget} onChange={set("budget")} />
              </Field>
              <Field label="Follow up on" htmlFor="d-follow">
                <Input id="d-follow" type="date" value={f.followUp} onChange={set("followUp")} />
              </Field>
            </div>
            <Field label="Notes" htmlFor="d-notes">
              <Textarea id="d-notes" rows={3} value={f.notes} onChange={set("notes")} />
            </Field>
            <Button type="submit" loading={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>

          {(record.projects.length > 0 || record.invoices.length > 0) && (
            <div className="space-y-2 border-t border-card-border p-5 text-sm">
              {record.projects.map((p) => (
                <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="block text-neutral-brand-color hover:underline">
                  Project: {p.name}
                </Link>
              ))}
              {record.invoices.map((inv) => (
                <p key={inv.id} className="text-text-secondary">
                  {inv.invoiceNumber} ({inv.status})
                </p>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <form onSubmit={handleLog} className="space-y-3 p-5 pt-0">
            <div className="flex gap-2">
              <NativeSelect value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Activity type" className="h-9 w-32 py-0">
                {ACTIVITY_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" size="sm" loading={logging} disabled={!summary.trim()}>
                Log
              </Button>
            </div>
            <Textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What happened? e.g. Called, wants a quote by Friday"
              maxLength={5000}
              aria-label="Activity summary"
            />
          </form>
          {activity.length === 0 ? (
            <EmptyState variant="plain" title="Nothing logged yet" description="Log calls, WhatsApp chats and notes here." />
          ) : (
            <ul className="divide-y divide-card-border border-t border-card-border">
              {activity.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-text-tertiary">
                    <span className="font-medium capitalize">{a.kind === "system" ? "Update" : a.kind}</span>
                    <time dateTime={a.occurredAt}>{new Date(a.occurredAt).toLocaleString()}</time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">{a.detail}</p>
                  <p className="mt-0.5 text-xs text-text-tertiary">{a.actor.name}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={lostOpen} onClose={() => setLostOpen(false)} size="sm">
        <form onSubmit={markLost}>
          <ModalHeader title="Mark as lost" description="A short reason helps you learn what to change." />
          <ModalBody>
            <Field label="Reason" htmlFor="lost-reason" required>
              <Input id="lost-reason" value={lostReason} onChange={(e) => setLostReason(e.target.value)} required maxLength={500} />
            </Field>
          </ModalBody>
          <ModalFooter>
            <Button type="button" appearance="outline" onClick={() => setLostOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!lostReason.trim()}>
              Mark lost
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
