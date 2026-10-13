"use client";

import {
  type Column,
  DataTable,
  ErrorNote,
  FormGrid,
  money,
  Page,
  PageBody,
  PageHeader,
  Panel,
  SelectInput,
  StatCard,
  StatGrid,
  StatGridSkeleton,
  TextInput,
} from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { downloadCsv } from "@/lib/download";
import { formatHours } from "@/lib/format-duration";
import { useApi } from "@/lib/query";
import { useState } from "react";
import { toast } from "sonner";

interface ReportRow {
  projectId?: string;
  projectName?: string;
  userId?: string;
  name?: string;
  seconds: number;
  billableSeconds: number;
  valueCents: number;
}

interface Report {
  totals: { seconds: number; billableSeconds: number; valueCents: number };
  byProject: ReportRow[];
  byUser: ReportRow[];
}

export default function TimeReportPage() {
  const [projectId, setProjectId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const projects = useApi<{ data: { id: string; name: string }[] } | { id: string; name: string }[]>("/projects?limit=200");
  const projectList = Array.isArray(projects.data) ? projects.data : (projects.data?.data ?? []);

  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const report = useApi<Report>(`/time-entries/report?${params}`);

  const rowCols = (nameKey: "projectName" | "name", label: string): Column<ReportRow>[] => [
    { key: "name", header: label, cell: (r) => <span className="font-medium text-text-primary">{r[nameKey] ?? "-"}</span> },
    { key: "hours", header: "Hours", cell: (r) => <span className="font-numeric tabular-nums">{formatHours(r.seconds)}</span> },
    { key: "billable", header: "Billable", cell: (r) => <span className="font-numeric tabular-nums">{formatHours(r.billableSeconds)}</span> },
    { key: "value", header: "Value", cell: (r) => <span className="font-numeric tabular-nums">{money(r.valueCents)}</span> },
  ];

  return (
    <Page>
      <PageHeader
        title="Time report"
        description="Tracked hours, billable time and value across projects and team members."
        actions={
          <Button
            appearance="outline"
            variant="primary"
            onPress={() => downloadCsv(`/time-entries/report/export?${params}`).catch((e) => toast.error(e.message))}
          >
            Export CSV
          </Button>
        }
      />
      <PageBody>
        <Panel>
          <FormGrid cols={3}>
            <SelectInput
              label="Project"
              value={projectId}
              onChange={setProjectId}
              options={[{ value: "", label: "All projects" }, ...projectList.map((p) => ({ value: p.id, label: p.name }))]}
            />
            <TextInput label="From" type="date" value={from} onChange={setFrom} />
            <TextInput label="To" type="date" value={to} onChange={setTo} />
          </FormGrid>
        </Panel>

        {report.error && <ErrorNote error={report.error} onRetry={() => report.refetch()} />}

        {report.isLoading || !report.data ? (
          <StatGridSkeleton count={3} />
        ) : (
          <>
            <StatGrid>
              <StatCard label="Total hours" value={formatHours(report.data.totals.seconds)} />
              <StatCard label="Billable hours" value={formatHours(report.data.totals.billableSeconds)} />
              <StatCard label="Total value" value={money(report.data.totals.valueCents)} />
            </StatGrid>

            <h2 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">By project</h2>
            <DataTable
              columns={rowCols("projectName", "Project")}
              rows={report.data.byProject}
              rowKey={(r) => r.projectId ?? r.projectName ?? ""}
              empty="No time tracked for these filters. Adjust the project or date range."
            />

            <h2 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">By team member</h2>
            <DataTable
              columns={rowCols("name", "Member")}
              rows={report.data.byUser}
              rowKey={(r) => r.userId ?? r.name ?? ""}
              empty="No time tracked for these filters."
            />
          </>
        )}
      </PageBody>
    </Page>
  );
}
