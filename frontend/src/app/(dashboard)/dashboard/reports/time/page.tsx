"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { downloadCsv } from "@/lib/download";
import { formatHours } from "@/lib/format-duration";
import {
  Alert,
  Button,
  Card,
  CardContent,
  EmptyState,
  Field,
  Input,
  NativeSelect,
  PageHeader,
  SectionHeading,
  StatCard,
  StatCardSkeleton,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  TableRowSkeleton,
} from "@/components/ui";
import { Clock, DollarSign, Download, FolderKanban, Timer, Users } from "lucide-react";

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

interface Project {
  id: string;
  name: string;
}

const fmtMoney = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export default function TimeReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: Project[] } | Project[]>("/projects?limit=200")
      .then((res) => setProjects(Array.isArray(res) ? res : res.data))
      .catch((err) => console.error(err));
  }, []);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const r = await apiFetch<Report>(
        `/time-entries/report?${params.toString()}`,
      );
      setReport(r);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load the time report");
    } finally {
      setLoading(false);
    }
  }, [projectId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv(): void {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    downloadCsv(`/time-entries/report/export?${params.toString()}`).catch(
      (err) => console.error(err),
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Time report"
        description="Tracked hours, billable time and value across projects and team members."
        actions={
          <Button type="button" appearance="outline" variant="primary" onClick={exportCsv}>
            <Download aria-hidden />
            Export CSV
          </Button>
        }
      />

      <Card>
        <CardContent className="mt-0 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Project" htmlFor="report-project">
            <NativeSelect
              id="report-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="From" htmlFor="report-from">
            <Input
              id="report-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="To" htmlFor="report-to">
            <Input
              id="report-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      {error ? <Alert status="error">{error}</Alert> : null}

      {loading || !report ? (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <Card className="overflow-hidden p-0">
            {[0, 1, 2, 3].map((index) => (
              <TableRowSkeleton key={index} columns={4} />
            ))}
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total hours"
              value={formatHours(report.totals.seconds)}
              icon={Clock}
              tone="brand"
            />
            <StatCard
              title="Billable hours"
              value={formatHours(report.totals.billableSeconds)}
              icon={Timer}
              tone="green"
            />
            <StatCard
              title="Total value"
              value={fmtMoney(report.totals.valueCents)}
              icon={DollarSign}
              tone="blue"
            />
          </div>

          <section className="space-y-4">
            <SectionHeading title="By project" />
            {report.byProject.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="size-5" aria-hidden />}
                title="No time tracked for these filters"
                description="Adjust the project or date range to see tracked time by project."
              />
            ) : (
              <Card className="overflow-hidden p-0">
                <TableRoot>
                  <TableHeader className="bg-background-gray-secondary_alt">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-text-secondary">
                        Project
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-text-secondary">
                        Hours
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-text-secondary">
                        Billable
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-text-secondary">
                        Value
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.byProject.map((r) => (
                      <TableRow key={r.projectId}>
                        <TableCell className="text-text-primary">{r.projectName}</TableCell>
                        <TableCell className="text-text-secondary">{formatHours(r.seconds)}</TableCell>
                        <TableCell className="text-text-secondary">
                          {formatHours(r.billableSeconds)}
                        </TableCell>
                        <TableCell className="text-text-secondary">{fmtMoney(r.valueCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableRoot>
              </Card>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeading title="By user" />
            {report.byUser.length === 0 ? (
              <EmptyState
                icon={<Users className="size-5" aria-hidden />}
                title="No time tracked for these filters"
                description="Adjust the project or date range to see tracked time by team member."
              />
            ) : (
              <Card className="overflow-hidden p-0">
                <TableRoot>
                  <TableHeader className="bg-background-gray-secondary_alt">
                    <TableRow>
                      <TableHead className="text-xs font-semibold text-text-secondary">
                        User
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-text-secondary">
                        Hours
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-text-secondary">
                        Billable
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-text-secondary">
                        Value
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.byUser.map((r) => (
                      <TableRow key={r.userId}>
                        <TableCell className="text-text-primary">{r.name}</TableCell>
                        <TableCell className="text-text-secondary">{formatHours(r.seconds)}</TableCell>
                        <TableCell className="text-text-secondary">
                          {formatHours(r.billableSeconds)}
                        </TableCell>
                        <TableCell className="text-text-secondary">{fmtMoney(r.valueCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableRoot>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
