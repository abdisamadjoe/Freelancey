"use client";

import { ImportLeadsModal } from "@/components/app/leads/import-leads-modal";
import { LeadBoard } from "@/components/app/leads/lead-board";
import {
  ActionButton,
  CheckInput,
  type Column,
  DataTable,
  fmtDate,
  FormGrid,
  Modal,
  Notice,
  Page,
  PageBody,
  PageHeader,
  PagerRow,
  type Paginated,
  Panel,
  SearchBox,
  SelectInput,
  StatusBadge,
  SwitchInput,
  TextAreaInput,
  TextInput,
  Toolbar,
} from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { useDebounce } from "@/hooks/use-debounce";
import { apiFetch } from "@/lib/api";
import {
  type ClientRecord,
  contactLine,
  isFollowUpDue,
  LEAD_SOURCES,
  LEAD_STATUS_OPTIONS,
  sourceLabel,
  STAGE_OPTIONS,
  stageBadge,
} from "@/lib/leads";
import { useApi } from "@/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface FormSettings {
  enabled: boolean;
  slug: string | null;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  website: "",
  company: "",
  source: "",
  interestedIn: "",
  budget: "",
  followUp: "",
  notes: "",
};

export default function LeadsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [stage, setStage] = useState("lead");
  const [leadStatus, setLeadStatus] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [dueOnly, setDueOnly] = useState(false);

  const [view, setView] = useState<"list" | "board">("list");
  const [boardKey, setBoardKey] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (stage) params.set("stage", stage);
  if (stage === "lead" && leadStatus) params.set("leadStatus", leadStatus);
  if (sourceFilter) params.set("source", sourceFilter);
  if (dueOnly) params.set("followUpDue", "true");

  const list = useApi<Paginated<ClientRecord>>(`/client-records?${params}`);
  const formSettings = useApi<FormSettings>("/client-records/lead-form");

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stage, leadStatus, sourceFilter, dueOnly]);

  const setField = (key: keyof typeof EMPTY_FORM) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.email.trim() && !form.phone.trim() && !form.whatsapp.trim()) {
      setFormError("Add at least one of email, phone or WhatsApp.");
      return;
    }
    const budget = form.budget.trim() ? Math.round(parseFloat(form.budget) * 100) : undefined;
    if (budget !== undefined && (Number.isNaN(budget) || budget < 0)) {
      setFormError("Budget must be a positive number.");
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/client-records", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          company: form.company.trim() || undefined,
          website: form.website.trim() || undefined,
          source: form.source || "manual",
          interestedIn: form.interestedIn.trim() || undefined,
          estimatedBudgetCents: budget,
          nextFollowUpAt: form.followUp ? new Date(form.followUp).toISOString() : undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      toast.success("Lead added");
      setBoardKey((k) => k + 1);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setStage("lead");
      setPage(1);
      await qc.invalidateQueries({ queryKey: ["api"] });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add lead");
    } finally {
      setCreating(false);
    }
  }

  async function toggleForm(enabled: boolean) {
    try {
      await apiFetch<FormSettings>("/client-records/lead-form", { method: "PUT", body: JSON.stringify({ enabled }) });
      await formSettings.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update the contact form");
    }
  }

  const publicUrl =
    formSettings.data?.slug && typeof window !== "undefined" ? `${window.location.origin}/contact/${formSettings.data.slug}` : "";

  const columns: Column<ClientRecord>[] = [
    {
      key: "name",
      header: "Name",
      cell: (r) => (
        <div>
          <Link href={`/dashboard/leads/${r.id}`} className="text-sm font-medium text-text-primary hover:text-neutral-brand-color">
            {r.name}
          </Link>
          {r.company && <p className="text-xs text-text-tertiary">{r.company}</p>}
        </div>
      ),
    },
    { key: "contact", header: "Contact", cell: (r) => <span className="text-text-secondary">{contactLine(r)}</span> },
    {
      key: "status",
      header: "Status",
      cell: (r) => {
        const badge = stageBadge(r);
        return <StatusBadge color={badge.color}>{badge.label}</StatusBadge>;
      },
    },
    { key: "source", header: "Source", cell: (r) => <span className="text-text-secondary">{sourceLabel(r.source)}</span> },
    {
      key: "follow",
      header: "Next follow-up",
      cell: (r) => {
        const due = r.stage === "lead" && isFollowUpDue(r.nextFollowUpAt);
        return r.nextFollowUpAt ? (
          <span className={due ? "font-medium text-alert-danger-title" : "text-text-secondary"}>
            {fmtDate(r.nextFollowUpAt)}
            {due ? " (due)" : ""}
          </span>
        ) : (
          <span className="text-text-tertiary">-</span>
        );
      },
    },
  ];

  return (
    <Page>
      <PageHeader
        title="Leads"
        description="Everyone who might become a client, and when to follow up."
        actions={
          <>
            <Button size="sm" appearance="outline" variant="primary" onPress={() => setView(view === "list" ? "board" : "list")}>
              {view === "list" ? "Board" : "List"}
            </Button>
            <Button size="sm" appearance="outline" variant="primary" onPress={() => setShowImport(true)}>
              Import
            </Button>
            <Button size="sm" variant="primary" onPress={() => setShowCreate(true)}>
              Add lead
            </Button>
          </>
        }
      />

      <PageBody>
        {list.error && <Notice status="error">{list.error.message}</Notice>}

        {formSettings.data && (
          <Panel>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">Public contact form</p>
                <p className="text-xs text-text-tertiary">
                  {formSettings.data.enabled
                    ? "Visitors can send you their details. New leads appear here and you get a notification."
                    : "Turn this on to get a link you can share on your website or social profiles."}
                </p>
                {formSettings.data.enabled && publicUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <code className="truncate rounded-sm bg-background-gray-secondary_alt px-2 py-1 text-xs text-text-secondary">{publicUrl}</code>
                    <Button
                      size="xs"
                      appearance="outline"
                      variant="primary"
                      onPress={() => {
                        navigator.clipboard.writeText(publicUrl).then(() => toast.success("Link copied"));
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                )}
              </div>
              <SwitchInput label="Enable public contact form" checked={formSettings.data.enabled} onChange={toggleForm} />
            </div>
          </Panel>
        )}

        {view === "board" ? (
          <LeadBoard key={boardKey} />
        ) : (
          <>
            <Toolbar>
              <SearchBox value={search} onChange={setSearch} placeholder="Search name, company, email, phone..." />
              <div className="w-full sm:w-48">
                <SelectInput
                  value={stage}
                  onChange={(v) => {
                    setStage(v);
                    setLeadStatus("");
                  }}
                  options={STAGE_OPTIONS}
                />
              </div>
              {stage === "lead" && (
                <div className="w-full sm:w-44">
                  <SelectInput
                    value={leadStatus}
                    onChange={setLeadStatus}
                    options={[{ value: "", label: "All statuses" }, ...LEAD_STATUS_OPTIONS]}
                  />
                </div>
              )}
              <div className="w-full sm:w-44">
                <SelectInput
                  value={sourceFilter}
                  onChange={setSourceFilter}
                  options={[{ value: "", label: "All sources" }, ...LEAD_SOURCES]}
                />
              </div>
              <CheckInput checked={dueOnly} onChange={setDueOnly} label="Follow-up due" />
            </Toolbar>

            <DataTable
              columns={columns}
              rows={list.data?.data}
              rowKey={(r) => r.id}
              loading={list.isLoading}
              empty={
                debouncedSearch || dueOnly || leadStatus || sourceFilter
                  ? "No matching leads"
                  : "No leads yet. Add a lead by hand, or share your contact form link to collect them automatically."
              }
            />
            <PagerRow page={page} totalPages={list.data?.meta.totalPages ?? 1} onPageChange={setPage} />
          </>
        )}
      </PageBody>

      <ImportLeadsModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => {
          qc.invalidateQueries({ queryKey: ["api"] });
          setBoardKey((k) => k + 1);
        }}
      />

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add lead"
        description="Name and one way to reach them is enough. Everything else is optional."
        footer={
          <>
            <Button appearance="outline" variant="primary" onPress={() => setShowCreate(false)}>
              Cancel
            </Button>
            <ActionButton variant="primary" appearance="fill" loading={creating} isDisabled={!form.name.trim()} onPress={() => handleCreate({ preventDefault() {} } as React.FormEvent)}>
              {creating ? "Adding..." : "Add lead"}
            </ActionButton>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <Notice status="error">{formError}</Notice>}
          <TextInput label="Name" required value={form.name} onChange={setField("name")} />
          <FormGrid>
            <TextInput label="Email" type="email" value={form.email} onChange={setField("email")} />
            <TextInput label="Phone" value={form.phone} onChange={setField("phone")} />
            <TextInput label="WhatsApp" value={form.whatsapp} onChange={setField("whatsapp")} />
            <TextInput label="Company" value={form.company} onChange={setField("company")} />
            <TextInput label="Website" value={form.website} onChange={setField("website")} />
            <SelectInput
              label="Source"
              value={form.source}
              onChange={setField("source")}
              options={[{ value: "", label: "Manual (default)" }, ...LEAD_SOURCES]}
            />
            <TextInput label="Interested in" value={form.interestedIn} onChange={setField("interestedIn")} />
            <TextInput label="Estimated budget" type="number" min="0" step="0.01" value={form.budget} onChange={setField("budget")} />
            <TextInput label="Follow up on" type="date" value={form.followUp} onChange={setField("followUp")} />
          </FormGrid>
          <TextAreaInput label="Notes" rows={3} value={form.notes} onChange={setField("notes")} />
        </form>
      </Modal>
    </Page>
  );
}
