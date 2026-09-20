"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Plus, UserPlus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { Pagination } from "@/components/pagination";
import { useToast } from "@/components/toast";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  DataToolbar,
  EmptyState,
  Field,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NativeSelect,
  PageHeader,
  SearchInput,
  Switch,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  Textarea,
} from "@/components/ui";
import {
  type ClientRecord,
  LEAD_SOURCES,
  LEAD_STATUS_OPTIONS,
  STAGE_OPTIONS,
  contactLine,
  isFollowUpDue,
  stageBadge,
} from "@/lib/leads";

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface FormSettings {
  enabled: boolean;
  slug: string | null;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  company: "",
  source: "",
  interestedIn: "",
  budget: "",
  followUp: "",
  notes: "",
};

export default function LeadsPage() {
  const { success, error: showError } = useToast();
  const [rows, setRows] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [stage, setStage] = useState("lead");
  const [leadStatus, setLeadStatus] = useState("");
  const [dueOnly, setDueOnly] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  const [formSettings, setFormSettings] = useState<FormSettings | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (stage) params.set("stage", stage);
      if (stage === "lead" && leadStatus) params.set("leadStatus", leadStatus);
      if (dueOnly) params.set("followUpDue", "true");
      const res = await apiFetch<Paginated<ClientRecord>>(`/client-records?${params}`);
      setRows(res.data);
      setTotalPages(res.meta.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, stage, leadStatus, dueOnly]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stage, leadStatus, dueOnly]);

  useEffect(() => {
    apiFetch<FormSettings>("/client-records/lead-form")
      .then(setFormSettings)
      .catch(() => setFormSettings(null));
  }, []);

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.email.trim() && !form.phone.trim() && !form.whatsapp.trim()) {
      setFormError("Add at least one of email, phone or WhatsApp.");
      return;
    }
    setCreating(true);
    try {
      const budget = form.budget.trim() ? Math.round(parseFloat(form.budget) * 100) : undefined;
      if (budget !== undefined && (Number.isNaN(budget) || budget < 0)) {
        setFormError("Budget must be a positive number.");
        return;
      }
      await apiFetch("/client-records", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          company: form.company.trim() || undefined,
          source: form.source || undefined,
          interestedIn: form.interestedIn.trim() || undefined,
          estimatedBudgetCents: budget,
          nextFollowUpAt: form.followUp ? new Date(form.followUp).toISOString() : undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      success("Lead added");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setStage("lead");
      setPage(1);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add lead");
    } finally {
      setCreating(false);
    }
  }

  async function toggleForm(enabled: boolean) {
    try {
      setFormSettings(await apiFetch<FormSettings>("/client-records/lead-form", {
        method: "PUT",
        body: JSON.stringify({ enabled }),
      }));
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update the contact form");
    }
  }

  const publicUrl =
    formSettings?.slug && typeof window !== "undefined" ? `${window.location.origin}/contact/${formSettings.slug}` : "";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leads"
        description="Everyone who might become a client, and when to follow up."
        actions={
          <Button size="sm" iconOnly={false} onClick={() => setShowCreate(true)}>
            <Plus />
            <span>Add lead</span>
          </Button>
        }
      />

      {error && <Alert status="error">{error}</Alert>}

      {formSettings && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary">Public contact form</p>
            <p className="text-xs text-text-tertiary">
              {formSettings.enabled
                ? "Visitors can send you their details. New leads appear here and you get a notification."
                : "Turn this on to get a link you can share on your website or social profiles."}
            </p>
            {formSettings.enabled && publicUrl && (
              <div className="mt-2 flex items-center gap-2">
                <code className="truncate rounded bg-background-gray-secondary_alt px-2 py-1 text-xs text-text-secondary">
                  {publicUrl}
                </code>
                <Button
                  type="button"
                  appearance="outline"
                  size="xs"
                  iconOnly={false}
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl).then(() => success("Link copied"));
                  }}
                >
                  <Copy />
                  <span>Copy</span>
                </Button>
              </div>
            )}
          </div>
          <Switch
            checked={formSettings.enabled}
            onCheckedChange={toggleForm}
            label={<span className="sr-only">Enable public contact form</span>}
          />
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <DataToolbar
          trailing={
            <Checkbox
              id="due-only"
              checked={dueOnly}
              onChange={(e) => setDueOnly(e.target.checked)}
              label="Follow-up due"
            />
          }
        >
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, email, phone..."
            maxLength={200}
            aria-label="Search leads"
            onClear={() => setSearch("")}
            wrapperClassName="w-full sm:w-72"
          />
          <div className="w-full sm:w-48">
            <NativeSelect
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                setLeadStatus("");
              }}
              aria-label="Filter by stage"
              className="h-10 w-full py-0"
            >
              {STAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          {stage === "lead" && (
            <div className="w-full sm:w-44">
              <NativeSelect
                value={leadStatus}
                onChange={(e) => setLeadStatus(e.target.value)}
                aria-label="Filter by lead status"
                className="h-10 w-full py-0"
              >
                <option value="">All statuses</option>
                {LEAD_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
        </DataToolbar>

        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-text-tertiary">Loading...</p>
        ) : rows.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={<UserPlus className="size-5" aria-hidden />}
            title={debouncedSearch || dueOnly || leadStatus ? "No matching leads" : "No leads yet"}
            description="Add a lead by hand, or share your contact form link to collect them automatically."
            action={
              <Button size="sm" iconOnly={false} onClick={() => setShowCreate(true)}>
                <Plus />
                <span>Add lead</span>
              </Button>
            }
          />
        ) : (
          <TableRoot>
            <TableHeader>
              <TableRow className="bg-background-gray-secondary_alt">
                <TableHead className="text-xs font-semibold text-text-secondary">Name</TableHead>
                <TableHead className="text-xs font-semibold text-text-secondary">Contact</TableHead>
                <TableHead className="text-xs font-semibold text-text-secondary">Status</TableHead>
                <TableHead className="text-xs font-semibold text-text-secondary">Source</TableHead>
                <TableHead className="text-xs font-semibold text-text-secondary">Next follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const badge = stageBadge(r);
                const due = r.stage === "lead" && isFollowUpDue(r.nextFollowUpAt);
                return (
                  <TableRow key={r.id} className="hover:bg-background-gray-primary">
                    <TableCell>
                      <Link
                        href={`/dashboard/leads/${r.id}`}
                        className="text-sm font-medium text-text-primary hover:text-neutral-brand-color"
                      >
                        {r.name}
                      </Link>
                      {r.company && <p className="text-xs text-text-tertiary">{r.company}</p>}
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-sm text-text-secondary">{contactLine(r)}</TableCell>
                    <TableCell>
                      <Badge color={badge.color}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">{r.source ?? "-"}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {r.nextFollowUpAt ? (
                        <span className={due ? "font-medium text-alert-danger-title" : "text-text-secondary"}>
                          {new Date(r.nextFollowUpAt).toLocaleDateString()}
                          {due ? " (due)" : ""}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableRoot>
        )}
      </Card>

      {!loading && rows.length > 0 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={handleCreate}>
          <ModalHeader title="Add lead" description="Name and one way to reach them is enough. Everything else is optional." />
          <ModalBody className="space-y-4">
            {formError && <Alert status="error">{formError}</Alert>}
            <Field label="Name" htmlFor="lead-name" required>
              <Input id="lead-name" value={form.name} onChange={set("name")} required maxLength={200} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" htmlFor="lead-email">
                <Input id="lead-email" type="email" value={form.email} onChange={set("email")} />
              </Field>
              <Field label="Phone" htmlFor="lead-phone">
                <Input id="lead-phone" value={form.phone} onChange={set("phone")} />
              </Field>
              <Field label="WhatsApp" htmlFor="lead-whatsapp">
                <Input id="lead-whatsapp" value={form.whatsapp} onChange={set("whatsapp")} />
              </Field>
              <Field label="Company" htmlFor="lead-company">
                <Input id="lead-company" value={form.company} onChange={set("company")} />
              </Field>
              <Field label="Source" htmlFor="lead-source">
                <NativeSelect id="lead-source" value={form.source} onChange={set("source")}>
                  <option value="">Not sure</option>
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Interested in" htmlFor="lead-interest">
                <Input id="lead-interest" value={form.interestedIn} onChange={set("interestedIn")} />
              </Field>
              <Field label="Estimated budget" htmlFor="lead-budget">
                <Input id="lead-budget" type="number" min="0" step="0.01" value={form.budget} onChange={set("budget")} />
              </Field>
              <Field label="Follow up on" htmlFor="lead-followup">
                <Input id="lead-followup" type="date" value={form.followUp} onChange={set("followUp")} />
              </Field>
            </div>
            <Field label="Notes" htmlFor="lead-notes">
              <Textarea id="lead-notes" rows={3} value={form.notes} onChange={set("notes")} />
            </Field>
          </ModalBody>
          <ModalFooter>
            <Button type="button" appearance="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              {creating ? "Adding..." : "Add lead"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
