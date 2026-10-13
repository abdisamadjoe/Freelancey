"use client";

import { LeadBoard } from "@/components/app/leads/lead-board";
import {
  CheckInput,
  type Column,
  DataTable,
  fmtDate,
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
  Toolbar,
} from "@/components/app/kit";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
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
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface FormSettings {
  enabled: boolean;
  slug: string | null;
}

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [stage, setStage] = useState("lead");
  const [leadStatus, setLeadStatus] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [dueOnly, setDueOnly] = useState(false);

  const [view, setView] = useState<"list" | "board">("list");

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
            <Link
              href="/dashboard/leads/import"
              className={buttonStyles({ size: "sm", appearance: "outline", variant: "primary" })}
            >
              Import
            </Link>
            <Link href="/dashboard/leads/new" className={buttonStyles({ size: "sm" })}>
              Add lead
            </Link>
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
          <LeadBoard />
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
    </Page>
  );
}
