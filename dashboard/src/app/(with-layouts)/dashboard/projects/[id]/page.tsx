"use client";

import {
  ActionButton,
  AppTabs,
  CheckInput,
  ErrorNote,
  FormGrid,
  LabelChip,
  Loading,
  Modal,
  MultiSelectInput,
  Notice,
  Page,
  PageBody,
  PageHeader,
  Panel,
  StatusPill,
  TextInput,
  useConfirm,
} from "@/components/app/kit";
import { ContractsSection } from "@/components/app/projects/contracts-section";
import { DeliverablesSection } from "@/components/app/projects/deliverables-section";
import { ExpensesSection } from "@/components/app/projects/expenses-section";
import { FilesSection } from "@/components/app/projects/files-section";
import { HandoverSection } from "@/components/app/projects/handover-section";
import { InvoicesSection } from "@/components/app/projects/invoices-section";
import { MeetingsSection } from "@/components/app/projects/meetings-section";
import { NotesSection } from "@/components/app/projects/notes-section";
import { TasksSection } from "@/components/app/projects/tasks-section";
import { TimeTab } from "@/components/app/projects/time-tab";
import { UpdatesSection } from "@/components/app/projects/updates-section";
import { WorkflowSection } from "@/components/app/projects/workflow-section";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { startPreview } from "@/lib/preview-mode";
import { useSession } from "@/lib/session";
import { track } from "@/lib/track";
import { cn } from "@/utils/cn";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface FileRecord {
  id: string;
  filename: string;
  type?: "UPLOAD" | "LINK";
  mimeType?: string | null;
  sizeBytes?: number | null;
  url?: string | null;
  description?: string | null;
  createdAt: string;
}
interface LabelRecord {
  id: string;
  name: string;
  color: string;
}
interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  archivedAt?: string | null;
  hourlyRateCents?: number | null;
  clientId?: string | null;
  clients?: { userId: string }[];
  files: FileRecord[];
  labels?: { label: LabelRecord }[];
}
interface ProjectStatus {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
}
interface ClientMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

const TAB_IDS = ["updates", "workflow", "tasks", "deliverables", "files", "time", "meetings", "expenses", "contracts", "invoices", "notes", "handover"];

const HEADING = "text-xs font-medium tracking-wide text-text-tertiary uppercase";

function Content() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialog } = useConfirm();
  const session = useSession();
  const currentRole = session.member.role;
  const currentUserId = session.user.id;
  const isOwner = currentRole === "owner";

  const [project, setProject] = useState<Project | null>(null);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [clients, setClients] = useState<ClientMember[]>([]);
  const [orgLabels, setOrgLabels] = useState<LabelRecord[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [clientHasEmail, setClientHasEmail] = useState(false);

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateIncludeTasks, setDuplicateIncludeTasks] = useState(true);
  const [duplicateIncludeClients, setDuplicateIncludeClients] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  const tabParam = searchParams.get("tab");
  const initialTab = tabParam && TAB_IDS.includes(tabParam) ? tabParam : searchParams.get("task") ? "tasks" : "updates";

  const isArchived = !!project?.archivedAt;

  useEffect(() => {
    if (!project?.clientId) return;
    apiFetch<{ email: string | null }>(`/client-records/${project.clientId}`)
      .then((c) => setClientHasEmail(Boolean(c.email)))
      .catch(() => setClientHasEmail(false));
  }, [project?.clientId]);

  const loadProject = useCallback(() => {
    apiFetch<Project>(`/projects/${id}`)
      .then(setProject)
      .catch((err) => setError(err));
  }, [id]);

  useEffect(() => {
    loadProject();
    apiFetch<ProjectStatus[]>("/projects/statuses").then(setStatuses).catch(() => {});
    apiFetch<ClientMember[] | { data: ClientMember[] }>("/clients")
      .then((res) => {
        const data = Array.isArray(res) ? res : res.data;
        setClients(data.filter((m) => m.role === "member"));
      })
      .catch(() => {});
    apiFetch<LabelRecord[]>("/labels").then(setOrgLabels).catch(() => {});
  }, [loadProject, id]);

  const put = async (body: Record<string, unknown>, ok?: string) => {
    try {
      await apiFetch(`/projects/${id}`, { method: "PUT", body: JSON.stringify(body) });
      if (ok) toast.success(ok);
      loadProject();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleStatusChange = async (status: string) => {
    if (isArchived) return;
    await put({ status });
    track("project_status_changed", { status });
  };

  const handleClientsChange = async (userIds: string[]) => {
    if (!project || isArchived) return;
    await put({ clientUserIds: userIds });
  };

  const handleRateChange = async (rawValue: string) => {
    if (isArchived) return;
    const trimmed = rawValue.trim();
    let cents: number | null = null;
    if (trimmed !== "") {
      const dollars = Number(trimmed);
      if (!Number.isFinite(dollars) || dollars < 0) {
        toast.error("Enter a valid non-negative rate");
        return;
      }
      cents = Math.round(dollars * 100);
    }
    if ((project?.hourlyRateCents ?? null) === cents) return;
    await put({ hourlyRateCents: cents }, "Rate updated");
  };

  const handleLabelsChange = async (labelIds: string[]) => {
    if (!project || isArchived) return;
    const current = new Set((project.labels ?? []).map((l) => l.label.id));
    const next = new Set(labelIds);
    try {
      for (const lid of next) {
        if (!current.has(lid)) {
          await apiFetch(`/labels/${lid}/assign`, { method: "POST", body: JSON.stringify({ entityType: "project", entityId: id }) });
        }
      }
      for (const lid of current) {
        if (!next.has(lid)) {
          await apiFetch(`/labels/${lid}/assign`, { method: "DELETE", body: JSON.stringify({ entityType: "project", entityId: id }) });
        }
      }
      loadProject();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update labels");
    }
  };

  const handleArchive = async () => {
    const ok = await confirm({
      title: "Archive Project",
      message: "Archive this project? It will be hidden from clients and editing will be disabled.",
      confirmLabel: "Archive",
    });
    if (!ok) return;
    try {
      await apiFetch(`/projects/${id}/archive`, { method: "POST" });
      loadProject();
      toast.success("Project archived");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive project");
    }
  };

  const handleUnarchive = async () => {
    try {
      await apiFetch(`/projects/${id}/unarchive`, { method: "POST" });
      loadProject();
      toast.success("Project unarchived");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unarchive project");
    }
  };

  const handleDuplicate = async () => {
    const name = duplicateName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setDuplicating(true);
    try {
      const created = await apiFetch<{ id: string }>(`/projects/${id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ name, includeTasks: duplicateIncludeTasks, includeClients: duplicateIncludeClients }),
      });
      toast.success("Project duplicated");
      setDuplicateOpen(false);
      router.push(`/dashboard/projects/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate project");
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete Project",
      message: `Permanently delete "${project?.name ?? ""}" and all its data? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await apiFetch(`/projects/${id}`, { method: "DELETE" });
      toast.success("Project deleted");
      router.push("/dashboard/projects");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  if (!project) {
    return error ? (
      <Page>
        <PageBody>
          <ErrorNote error={error} />
        </PageBody>
      </Page>
    ) : (
      <Loading />
    );
  }

  const assignedIds = new Set((project.clients ?? []).map((c) => c.userId));
  const currentStatus = statuses.find((s) => s.slug === project.status);
  const currentIndex = statuses.findIndex((s) => s.slug === project.status);
  const projectLabelIds = (project.labels ?? []).map((l) => l.label.id);
  const canPreview = currentRole === "owner" || currentRole === "admin";

  const daysLeft = (() => {
    if (!project.endDate || isArchived) return null;
    const diff = Math.ceil((new Date(project.endDate).getTime() - Date.now()) / 86_400_000);
    if (diff < 0) return { text: `${Math.abs(diff)} day${Math.abs(diff) !== 1 ? "s" : ""} overdue`, warn: true };
    if (diff === 0) return { text: "Due today", warn: true };
    return { text: `${diff} day${diff !== 1 ? "s" : ""} left`, warn: diff <= 7 };
  })();

  const sidebar = (
    <aside className="w-full space-y-5 lg:w-80 lg:shrink-0">
      <Panel title="Status" action={<StatusPill status={project.status} label={currentStatus?.name} />}>
        {statuses.length > 0 ? (
          <ol className="space-y-1">
            {statuses.map((stage, index) => {
              const isCurrent = stage.slug === project.status;
              const isDone = currentIndex >= 0 && index < currentIndex;
              return (
                <li key={stage.id}>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(stage.slug)}
                    disabled={isArchived}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                      isCurrent
                        ? "bg-background-gray-secondary_alt font-medium text-text-primary"
                        : "text-text-tertiary hover:bg-background-gray-secondary_alt/60 hover:text-text-primary",
                      isArchived && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border-[0.5px] text-[10px]",
                        isDone && "border-primary-500 bg-primary-500 text-white-100",
                        isCurrent && !isDone && "border-primary-500 bg-card-background text-neutral-brand-color",
                        !isCurrent && !isDone && "border-card-border bg-card-background text-icon-tertiary",
                      )}
                    >
                      {isDone ? "✓" : <span className="size-1.5 rounded-full bg-current" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{stage.name}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-text-tertiary">No workflow stages configured.</p>
        )}
      </Panel>

      <Panel title={`Clients${assignedIds.size > 0 ? ` (${assignedIds.size})` : ""}`}>
        {clients.length > 0 ? (
          <div className="space-y-3">
            <MultiSelectInput
              value={[...assignedIds]}
              onChange={handleClientsChange}
              placeholder="Search clients..."
              options={clients.map((c) => ({ value: c.userId, label: `${c.user.name} (${c.user.email})` }))}
            />
            {canPreview &&
              clients
                .filter((c) => assignedIds.has(c.userId))
                .map((c) => (
                  <div key={c.userId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-text-primary">{c.user.name}</span>
                    <Button
                      size="xs"
                      appearance="outline"
                      variant="primary"
                      onPress={() => {
                        track("client_viewed_as", { from: "project" });
                        startPreview(c.userId, c.user.name, c.user.email);
                      }}
                    >
                      View as client
                    </Button>
                  </div>
                ))}
            {assignedIds.size > 0 && (
              <p className="text-xs text-text-tertiary">
                {assignedIds.size === 1 ? "This client will" : "These clients will"} see this project in their portal.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-tertiary">
            No clients yet. Invite clients from the{" "}
            <a href="/dashboard/clients" className="text-neutral-brand-color hover:underline">
              Clients page
            </a>
            .
          </p>
        )}
      </Panel>

      <Panel>
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className={HEADING}>Labels</h2>
            {orgLabels.length > 0 ? (
              <MultiSelectInput
                value={projectLabelIds}
                onChange={handleLabelsChange}
                placeholder="Add labels"
                options={orgLabels.map((l) => ({ value: l.id, label: l.name }))}
              />
            ) : (
              <p className="text-xs text-text-tertiary">No labels yet. Create them in Settings.</p>
            )}
            {projectLabelIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(project.labels ?? []).map((l) => (
                  <LabelChip key={l.label.id} name={l.label.name} color={l.label.color} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-card-border pt-4">
            <h2 className={HEADING}>Timeline</h2>
            <TextInput
              label="Start"
              type="date"
              disabled={isArchived}
              value={project.startDate ? project.startDate.slice(0, 10) : ""}
              onChange={(v) => put({ startDate: v || null })}
            />
            <TextInput
              label="End"
              type="date"
              disabled={isArchived}
              value={project.endDate ? project.endDate.slice(0, 10) : ""}
              onChange={(v) => put({ endDate: v || null })}
            />
            {daysLeft && (
              <p className={cn("text-xs font-medium", daysLeft.warn ? "text-badge-warning-text" : "text-text-tertiary")}>{daysLeft.text}</p>
            )}
          </div>

          {canPreview && (
            <div className="space-y-2 border-t border-card-border pt-4">
              <h2 className={HEADING}>Default rate</h2>
              <label className="flex items-center justify-between gap-2">
                <span className="shrink-0 text-sm text-text-tertiary">$/hour</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Member rate"
                  key={project.hourlyRateCents ?? "empty"}
                  defaultValue={project.hourlyRateCents != null ? (project.hourlyRateCents / 100).toString() : ""}
                  onBlur={(e) => handleRateChange(e.target.value)}
                  disabled={isArchived}
                  className="w-36 rounded-lg border border-card-border bg-input-background px-3 py-2 text-right text-sm text-title-50 outline-none focus:border-input-primary-focus-border"
                />
              </label>
              <p className="text-xs text-text-tertiary">Overrides each member&apos;s default rate for time on this project.</p>
            </div>
          )}

          {isOwner && (
            <div className="border-t border-card-border pt-4">
              <Button variant="danger" appearance="ghost" size="sm" onPress={handleDelete}>
                Delete project
              </Button>
            </div>
          )}
        </div>
      </Panel>
    </aside>
  );

  return (
    <Page>
      <PageHeader
        title={project.name}
        description={project.description || undefined}
        actions={
          <>
            <StatusPill status={project.status} label={currentStatus?.name} />
            {canPreview && (
              <Button
                appearance="outline"
                variant="primary"
                size="sm"
                onPress={() => {
                  setDuplicateName(`${project.name} (copy)`);
                  setDuplicateIncludeTasks(true);
                  setDuplicateIncludeClients(false);
                  setDuplicateOpen(true);
                }}
              >
                Duplicate
              </Button>
            )}
            {isArchived ? (
              <Button appearance="outline" variant="primary" size="sm" onPress={handleUnarchive}>
                Unarchive
              </Button>
            ) : (
              <Button appearance="outline" variant="primary" size="sm" onPress={handleArchive}>
                Archive
              </Button>
            )}
          </>
        }
      />

      <PageBody>
        {isArchived && <Notice status="warning">Archived. Editing disabled.</Notice>}

        <div className="flex flex-col items-start gap-5 lg:flex-row">
          {sidebar}
          <div className="w-full min-w-0 flex-1">
            <AppTabs
              defaultValue={initialTab}
              tabs={[
                {
                  value: "updates",
                  label: "Updates",
                  content: (
                    <UpdatesSection projectId={id} isArchived={isArchived} onFileChange={loadProject} currentUserId={currentUserId} currentRole={currentRole} />
                  ),
                },
                {
                  value: "workflow",
                  label: "Workflow",
                  content: <WorkflowSection projectId={id} clientId={project.clientId ?? null} isArchived={isArchived} />,
                },
                { value: "tasks", label: "Tasks", content: <TasksSection projectId={id} isArchived={isArchived} /> },
                {
                  value: "deliverables",
                  label: "Deliverables",
                  content: <DeliverablesSection projectId={id} clientEmail={clientHasEmail} isArchived={isArchived} />,
                },
                {
                  value: "files",
                  label: "Files",
                  content: (
                    <FilesSection
                      projectId={id}
                      isArchived={isArchived}
                      files={project.files}
                      onFileChange={loadProject}
                      projectClients={clients.filter((c) => assignedIds.has(c.userId))}
                    />
                  ),
                },
                { value: "time", label: "Time", content: <TimeTab projectId={id} isArchived={isArchived} /> },
                { value: "meetings", label: "Meetings", content: <MeetingsSection projectId={id} isArchived={isArchived} /> },
                { value: "expenses", label: "Expenses", content: <ExpensesSection projectId={id} isArchived={isArchived} /> },
                { value: "contracts", label: "Contracts", content: <ContractsSection projectId={id} isArchived={isArchived} /> },
                { value: "invoices", label: "Invoices", content: <InvoicesSection projectId={id} isArchived={isArchived} /> },
                { value: "notes", label: "Notes", content: <NotesSection projectId={id} isArchived={isArchived} /> },
                {
                  value: "handover",
                  label: "Handover",
                  content: <HandoverSection projectId={id} clientEmail={clientHasEmail} isArchived={isArchived} onProjectChange={loadProject} />,
                },
              ]}
            />
          </div>
        </div>
      </PageBody>

      <Modal
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        title="Duplicate Project"
        description="Files, updates, invoices, and notes are not copied."
        footer={
          <>
            <Button appearance="outline" variant="primary" isDisabled={duplicating} onPress={() => setDuplicateOpen(false)}>
              Cancel
            </Button>
            <ActionButton variant="primary" loading={duplicating} isDisabled={!duplicateName.trim()} onPress={handleDuplicate}>
              {duplicating ? "Duplicating…" : "Duplicate"}
            </ActionButton>
          </>
        }
      >
        <FormGrid cols={1}>
          <TextInput label="Name" value={duplicateName} onChange={setDuplicateName} />
          <CheckInput checked={duplicateIncludeTasks} onChange={setDuplicateIncludeTasks} label="Include tasks" />
          <CheckInput checked={duplicateIncludeClients} onChange={setDuplicateIncludeClients} label="Include client assignments" />
        </FormGrid>
      </Modal>
      {dialog}
    </Page>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}
