"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { Pagination } from "@/components/pagination";
import { ProjectCardSkeleton } from "@/components/skeletons";
import { Plus, FolderOpen, Archive, Tag, Download, Sparkles, ExternalLink, ArrowUpRight, Check } from "lucide-react";
import { track } from "@/lib/track";
import { LabelBadge } from "@/components/label-badge";
import { downloadCsv } from "@/lib/download";
import { useAppConfig } from "@/lib/app-config";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  buttonStyles,
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
  StatusBadge,
  Textarea,
} from "@/components/ui";

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

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export default function ProjectsPage() {
  const config = useAppConfig();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [planLimits, setPlanLimits] = useState<{ maxProjects: number; projectsUsed: number } | null>(null);

  // Pagination & filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [orgLabels, setOrgLabels] = useState<LabelRecord[]>([]);
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [labelFilterOpen, setLabelFilterOpen] = useState(false);
  const labelFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!labelFilterOpen) return;
    function handleClick(e: MouseEvent) {
      if (labelFilterRef.current && !labelFilterRef.current.contains(e.target as Node)) {
        setLabelFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [labelFilterOpen]);

  useEffect(() => {
    apiFetch<ProjectStatus[]>("/projects/statuses")
      .then(setStatuses)
      .catch(console.error);
    apiFetch<LabelRecord[]>("/labels")
      .then(setOrgLabels)
      .catch(console.error);
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);
      if (showArchived) params.set("archived", "true");
      if (labelFilter.length > 0) params.set("labels", labelFilter.join(","));
      const res = await apiFetch<PaginatedResponse<Project>>(
        `/projects?${params}`,
      );
      setProjects(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, showArchived, labelFilter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

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

  const [creating, setCreating] = useState(false);

  const atProjectLimit = planLimits !== null && planLimits.maxProjects !== -1 && planLimits.projectsUsed >= planLimits.maxProjects;
  const oneProjectLeft = planLimits !== null && planLimits.maxProjects !== -1 && !atProjectLimit && planLimits.maxProjects - planLimits.projectsUsed === 1;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      await apiFetch<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
      track("project_created");
      setName("");
      setDescription("");
      setShowCreate(false);
      loadProjects();
      if (planLimits) {
        setPlanLimits((prev) => prev ? { ...prev, projectsUsed: prev.projectsUsed + 1 } : prev);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const createModalOpen = showCreate && !atProjectLimit;
  const hasActiveFilters = Boolean(debouncedSearch) || Boolean(statusFilter) || labelFilter.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        description="Manage, organize, and monitor project workflows."
        actions={
          <>
            {planLimits && planLimits.maxProjects !== -1 && (
              <Badge
                color={atProjectLimit || oneProjectLeft ? "warning" : "gray"}
                className="hidden h-8 px-3 sm:inline-flex"
              >
                {planLimits.projectsUsed}/{planLimits.maxProjects} projects
              </Badge>
            )}
            <Button
              appearance="outline"
              size="sm"
              iconOnly={false}
              onClick={() => downloadCsv("/projects/export")}
              title="Export CSV"
            >
              <Download />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button size="sm" iconOnly={false} onClick={() => setShowCreate(!showCreate)}>
              {atProjectLimit ? <Sparkles /> : <Plus />}
              <span>New Project</span>
            </Button>
          </>
        }
      />

      {error && !createModalOpen && <Alert status="error">{error}</Alert>}

      {showCreate && atProjectLimit && (
        <Alert
          status="warning"
          title={`You've reached your limit of ${planLimits?.maxProjects} free projects`}
          actions={
            <>
              <Link
                href="/dashboard/settings/account?reason=projects#billing"
                className={buttonStyles({ size: "sm" })}
              >
                Upgrade
                <ExternalLink />
              </Link>
              <Button appearance="outline" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </>
          }
        >
          Upgrade to Pro for unlimited project creation and advanced client portal tools.
        </Alert>
      )}

      <Card className="overflow-hidden p-0">
        <DataToolbar
          trailing={
            <Checkbox
              id="show-archived"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              label="Show archived"
            />
          }
        >
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search project titles..."
            maxLength={200}
            aria-label="Search projects"
            onClear={() => setSearch("")}
            wrapperClassName="w-full sm:w-64"
          />

          <div className="w-full sm:w-44">
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="h-10 w-full py-0"
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          {orgLabels.length > 0 && (
            <div ref={labelFilterRef} className="relative">
              <Button
                type="button"
                appearance="outline"
                size="sm"
                iconOnly={false}
                className={
                  labelFilter.length > 0
                    ? "border-input-primary-focus-border bg-button-primary-outline-hover-background text-neutral-brand-color"
                    : undefined
                }
                aria-haspopup="true"
                aria-expanded={labelFilterOpen}
                onClick={() => setLabelFilterOpen(!labelFilterOpen)}
              >
                <Tag />
                <span>Labels</span>
                {labelFilter.length > 0 && (
                  <span className="rounded-full bg-button-primary-background px-1.5 py-0.5 text-xs font-medium text-button-primary-text">
                    {labelFilter.length}
                  </span>
                )}
              </Button>
              {labelFilterOpen && (
                <div className="absolute top-[calc(100%+6px)] left-0 z-40 max-h-60 w-52 overflow-y-auto rounded-xl border border-card-border bg-dropdowns-background p-1.5 shadow-md">
                  {orgLabels.map((label) => (
                    <button
                      type="button"
                      key={label.id}
                      onClick={() =>
                        setLabelFilter((prev) =>
                          prev.includes(label.id)
                            ? prev.filter((id) => id !== label.id)
                            : [...prev, label.id],
                        )
                      }
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-background-gray-secondary_alt hover:text-text-primary"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="min-w-0 flex-1 truncate">{label.name}</span>
                      {labelFilter.includes(label.id) && (
                        <Check className="size-4 shrink-0 text-neutral-brand-color" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DataToolbar>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group overflow-hidden p-0 transition-shadow hover:shadow-sm"
              >
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="flex h-full flex-col justify-between gap-4 p-5"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={project.name} size={36} />
                        <div className="min-w-0">
                          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary transition-colors group-hover:text-neutral-brand-color">
                            <span className="truncate">{project.name}</span>
                            <ArrowUpRight className="size-4 shrink-0 -translate-x-1 text-neutral-brand-color opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                          </h3>
                          <p className="mt-0.5 text-xs text-text-tertiary">
                            Created {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={project.status} className="shrink-0" />
                    </div>

                    {project.description && (
                      <p className="mt-3 line-clamp-2 text-sm leading-5 text-text-secondary">
                        {project.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-primary pt-3">
                    {project.labels && project.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {project.labels.map((l) => (
                          <LabelBadge key={l.label.id} name={l.label.name} color={l.label.color} />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-text-tertiary">No labels</span>
                    )}
                    {project.archivedAt && (
                      <Badge color="warning" prefixIcon={<Archive />}>
                        Archived
                      </Badge>
                    )}
                  </div>
                </Link>
              </Card>
            ))}
          </div>

          {projects.length === 0 && (
            <EmptyState
              icon={FolderOpen}
              title={hasActiveFilters ? "No matching projects found" : "No projects created yet"}
              description={
                hasActiveFilters
                  ? "Try adjusting your search query or status filter."
                  : "Create your first project workspace to start tracking tasks and contracts."
              }
            />
          )}

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Modal open={createModalOpen} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={handleCreate}>
          <ModalHeader
            title="New Project"
            description="Create a project workspace to start tracking tasks and contracts."
          />
          <ModalBody className="space-y-4">
            {error && <Alert status="error">{error}</Alert>}

            {oneProjectLeft && (
              <Alert
                status="warning"
                title="Last free project workspace."
                actions={
                  <Link
                    href="/dashboard/settings/account?reason=projects#billing"
                    className="text-xs font-medium text-neutral-brand-color hover:underline"
                  >
                    Upgrade →
                  </Link>
                }
              >
                Upgrade to Pro for unlimited.
              </Alert>
            )}

            <Field label="Project title" htmlFor="project-name" required>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project title (e.g., Website Redesign & Brand Assets)"
                required
              />
            </Field>

            <Field label="Description" htmlFor="project-description" description="Optional">
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project scope and description (optional)"
                rows={3}
              />
            </Field>
          </ModalBody>
          <ModalFooter>
            <Button type="button" appearance="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              {creating ? "Creating..." : "Create Workspace"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
