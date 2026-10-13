"use client";

import {
  CheckInput,
  Empty,
  LabelChip,
  Loading,
  MultiSelectInput,
  Notice,
  Page,
  PageBody,
  PageHeader,
  PagerRow,
  type Paginated,
  SearchBox,
  SelectInput,
  StatusPill,
  Toolbar,
  fmtDate,
} from "@/components/app/kit";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { useDebounce } from "@/hooks/use-debounce";
import { apiFetch } from "@/lib/api";
import { useAppConfig } from "@/lib/app-config";
import { downloadCsv } from "@/lib/download";
import { useApi } from "@/lib/query";
import Link from "next/link";
import { useEffect, useState } from "react";

interface LabelRecord {
  id: string;
  name: string;
  color: string;
}
interface Project {
  id: string;
  name: string;
  status: string;
  description?: string;
  archivedAt?: string | null;
  createdAt: string;
  labels?: { label: LabelRecord }[];
}
interface ProjectStatus {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export default function ProjectsPage() {
  const config = useAppConfig();
  const [planLimits, setPlanLimits] = useState<{ maxProjects: number; projectsUsed: number } | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [labelFilter, setLabelFilter] = useState<string[]>([]);

  const statuses = useApi<ProjectStatus[]>("/projects/statuses");
  const orgLabels = useApi<LabelRecord[]>("/labels");

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (statusFilter) params.set("status", statusFilter);
  if (showArchived) params.set("archived", "true");
  if (labelFilter.length > 0) params.set("labels", labelFilter.join(","));
  const projects = useApi<Paginated<Project>>(`/projects?${params}`);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, showArchived, labelFilter]);

  useEffect(() => {
    if (!config?.billingEnabled) return;
    Promise.all([
      apiFetch<{ subscription: { plan: { maxProjects: number } } | null }>("/billing/subscription").catch(() => null),
      apiFetch<{ projects: number }>("/billing/usage").catch(() => null),
    ]).then(([sub, usage]) => {
      if (sub?.subscription?.plan && usage != null) {
        setPlanLimits({ maxProjects: sub.subscription.plan.maxProjects, projectsUsed: usage.projects });
      }
    });
  }, [config?.billingEnabled]);

  const atProjectLimit = planLimits !== null && planLimits.maxProjects !== -1 && planLimits.projectsUsed >= planLimits.maxProjects;
  const oneProjectLeft =
    planLimits !== null && planLimits.maxProjects !== -1 && !atProjectLimit && planLimits.maxProjects - planLimits.projectsUsed === 1;

  const hasActiveFilters = Boolean(debouncedSearch) || Boolean(statusFilter) || labelFilter.length > 0;
  const rows = projects.data?.data ?? [];

  return (
    <Page>
      <PageHeader
        title="Projects"
        description="Manage, organize, and monitor project workflows."
        actions={
          <>
            {planLimits && planLimits.maxProjects !== -1 && (
              <Badge color={atProjectLimit || oneProjectLeft ? "warning" : "gray"} className="hidden sm:inline-flex">
                {planLimits.projectsUsed}/{planLimits.maxProjects} projects
              </Badge>
            )}
            <Button appearance="outline" variant="primary" size="sm" onPress={() => downloadCsv("/projects/export")}>
              Export
            </Button>
            <Link href="/dashboard/projects/new" className={buttonStyles({ size: "sm" })}>
              New Project
            </Link>
          </>
        }
      />

      <PageBody>
        {projects.error && <Notice status="error">{projects.error.message}</Notice>}

        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search project titles..." className="sm:w-64" />
          <div className="w-full sm:w-44">
            <SelectInput
              value={statusFilter}
              onChange={setStatusFilter}
              options={[{ value: "", label: "All statuses" }, ...(statuses.data ?? []).map((s) => ({ value: s.slug, label: s.name }))]}
            />
          </div>
          {(orgLabels.data?.length ?? 0) > 0 && (
            <div className="w-full sm:w-56">
              <MultiSelectInput
                value={labelFilter}
                onChange={setLabelFilter}
                placeholder="Labels"
                options={(orgLabels.data ?? []).map((l) => ({ value: l.id, label: l.name }))}
              />
            </div>
          )}
          <CheckInput checked={showArchived} onChange={setShowArchived} label="Show archived" />
        </Toolbar>

        {projects.isLoading ? (
          <Loading />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {rows.map((project) => (
                <Card key={project.id} className="group overflow-hidden p-0 transition-shadow hover:shadow-xs">
                  <Link href={`/dashboard/projects/${project.id}`} className="flex h-full flex-col justify-between gap-4 p-5">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-text-primary transition-colors group-hover:text-neutral-brand-color">
                            {project.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-text-tertiary">Created {fmtDate(project.createdAt)}</p>
                        </div>
                        <StatusPill status={project.status} />
                      </div>
                      {project.description && (
                        <p className="mt-3 line-clamp-2 text-sm leading-5 text-text-secondary">{project.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-primary pt-3">
                      {project.labels && project.labels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {project.labels.map((l) => (
                            <LabelChip key={l.label.id} name={l.label.name} color={l.label.color} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-text-tertiary">No labels</span>
                      )}
                      {project.archivedAt && <Badge color="warning">Archived</Badge>}
                    </div>
                  </Link>
                </Card>
              ))}
            </div>

            {rows.length === 0 && (
              <Empty>
                {hasActiveFilters
                  ? "No matching projects found. Try adjusting your search query or status filter."
                  : "No projects created yet. Create your first project workspace to start tracking tasks and contracts."}
              </Empty>
            )}

            <PagerRow page={page} totalPages={projects.data?.meta.totalPages ?? 1} onPageChange={setPage} />
          </>
        )}
      </PageBody>
    </Page>
  );
}
