"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import { ProjectDetailSkeleton } from "@/components/skeletons";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Trash2, Calendar, ChevronDown, Tag, Copy } from "lucide-react";
import { track } from "@/lib/track";
import { startPreview } from "@/lib/preview-mode";
import { LabelBadge } from "@/components/label-badge";
import { LabelPicker } from "@/components/label-picker";
import { StatusPipeline } from "./components/status-pipeline";
import { ClientAssignment } from "./components/client-assignment";
import { TasksSection } from "./components/tasks-section";
import { UpdatesSection } from "./components/updates-section";
import { FilesSection } from "./components/files-section";
import { InvoicesSection } from "./components/invoices-section";
import { NotesSection } from "./components/notes-section";
import { ContractsSection } from "@/components/contracts/contracts-section";
import { TimeTab } from "./time-tab";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Field,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { cn } from "@/lib/utils";

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

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const tabs = [
  { id: "updates", label: "Updates" },
  { id: "tasks", label: "Tasks" },
  { id: "files", label: "Files" },
  { id: "time", label: "Time" },
  { id: "contracts", label: "Contracts" },
  { id: "invoices", label: "Invoices" },
  { id: "notes", label: "Notes" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const SIDEBAR_HEADING =
  "flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-tertiary uppercase";

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function DateField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-sm text-text-tertiary">{label}</span>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.showPicker()}
          className="w-[140px] cursor-pointer rounded-lg border border-card-border bg-card-background px-2.5 py-1.5 text-right text-sm text-text-primary transition-colors hover:border-input-border disabled:cursor-not-allowed disabled:opacity-50 sm:w-[170px]"
        >
          {value ? formatDateDisplay(value) : <span className="text-text-tertiary">Select date</span>}
        </button>
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="pointer-events-none absolute inset-0 opacity-0"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const confirm = useConfirm();
  const { success, error: showError } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [clients, setClients] = useState<ClientMember[]>([]);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some((t) => t.id === tabParam)) return tabParam as TabId;
    if (searchParams.get("task")) return "tasks";
    return "updates";
  });

  // When a ?task=<id> deep link is set (e.g. from a notification or
  // cross-tab share), jump to the Tasks tab so the detail modal can open.
  // When a ?tab=<id> deep link is set (e.g. from the timer widget), jump to it.
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam as TabId);
      return;
    }
    if (searchParams.get("task")) setActiveTab("tasks");
  }, [searchParams]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [orgLabels, setOrgLabels] = useState<LabelRecord[]>([]);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateIncludeTasks, setDuplicateIncludeTasks] = useState(true);
  const [duplicateIncludeClients, setDuplicateIncludeClients] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const isArchived = !!project?.archivedAt;
  const isOwner = currentRole === "owner";

  const loadProject = useCallback(() => {
    apiFetch<Project>(`/projects/${id}`)
      .then(setProject)
      .catch((err) => setError(err.message || "Failed to load project"));
  }, [id]);

  useEffect(() => {
    loadProject();
    apiFetch<ProjectStatus[]>("/projects/statuses")
      .then(setStatuses)
      .catch(console.error);
    apiFetch<ClientMember[] | PaginatedResponse<ClientMember>>("/clients")
      .then((res) => {
        const data = Array.isArray(res) ? res : res.data;
        setClients(data.filter((m: ClientMember) => m.role === "member"));
      })
      .catch(console.error);
    apiFetch<{ user: { id: string }; member: { role: string } }>("/organizations/me")
      .then((s) => {
        setCurrentRole(s.member.role);
        setCurrentUserId(s.user.id);
      })
      .catch(console.error);
    apiFetch<LabelRecord[]>("/labels")
      .then(setOrgLabels)
      .catch(console.error);
  }, [loadProject, id]);

  const handleStatusChange = async (status: string) => {
    if (isArchived) return;
    await apiFetch(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    track("project_status_changed", { status });
    loadProject();
  };

  const handleClientToggle = async (userId: string) => {
    if (!project || isArchived) return;
    const currentIds = (project.clients ?? []).map((c) => c.userId);
    const newIds = currentIds.includes(userId)
      ? currentIds.filter((cid) => cid !== userId)
      : [...currentIds, userId];
    await apiFetch(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify({ clientUserIds: newIds }),
    });
    loadProject();
  };

  const handleRemoveClient = async (userId: string) => {
    if (!project || isArchived) return;
    const client = clients.find((c) => c.userId === userId);
    const ok = await confirm({
      title: "Remove client from project?",
      message: client
        ? `${client.user.name} will no longer see this project in their portal. You can re-add them at any time.`
        : "This client will no longer see this project in their portal. You can re-add them at any time.",
      confirmLabel: "Remove client",
      variant: "danger",
    });
    if (!ok) return;
    const newIds = (project.clients ?? [])
      .map((c) => c.userId)
      .filter((cid) => cid !== userId);
    await apiFetch(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify({ clientUserIds: newIds }),
    });
    loadProject();
  };

  const handlePreviewAsClient = (
    clientUserId: string,
    clientName: string,
    clientEmail: string,
  ) => {
    track("client_viewed_as", { from: "project" });
    startPreview(clientUserId, clientName, clientEmail);
  };

  const handleDateChange = async (field: "startDate" | "endDate", value: string) => {
    if (isArchived) return;
    try {
      await apiFetch(`/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify({ [field]: value || null }),
      });
      loadProject();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update date");
    }
  };

  const handleRateChange = async (rawValue: string) => {
    if (isArchived) return;
    const trimmed = rawValue.trim();
    let cents: number | null = null;
    if (trimmed !== "") {
      const dollars = Number(trimmed);
      if (!Number.isFinite(dollars) || dollars < 0) {
        showError("Enter a valid non-negative rate");
        return;
      }
      cents = Math.round(dollars * 100);
    }
    const current = project?.hourlyRateCents ?? null;
    if (current === cents) return;
    try {
      await apiFetch(`/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify({ hourlyRateCents: cents }),
      });
      success("Rate updated");
      loadProject();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update rate");
    }
  };

  const handleLabelToggle = async (labelId: string) => {
    if (!project || isArchived) return;
    const assignedIds = (project.labels ?? []).map((l) => l.label.id);
    const isAssigned = assignedIds.includes(labelId);
    try {
      if (isAssigned) {
        await apiFetch(`/labels/${labelId}/assign`, {
          method: "DELETE",
          body: JSON.stringify({ entityType: "project", entityId: id }),
        });
      } else {
        await apiFetch(`/labels/${labelId}/assign`, {
          method: "POST",
          body: JSON.stringify({ entityType: "project", entityId: id }),
        });
      }
      loadProject();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update labels");
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
      success("Project archived");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to archive project");
    }
  };

  const handleUnarchive = async () => {
    try {
      await apiFetch(`/projects/${id}/unarchive`, { method: "POST" });
      loadProject();
      success("Project unarchived");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to unarchive project");
    }
  };

  const openDuplicateModal = () => {
    setDuplicateName(project ? `${project.name} (copy)` : "");
    setDuplicateIncludeTasks(true);
    setDuplicateIncludeClients(false);
    setDuplicateOpen(true);
  };

  const handleDuplicate = async () => {
    const name = duplicateName.trim();
    if (!name) {
      showError("Name is required");
      return;
    }
    setDuplicating(true);
    try {
      const created = await apiFetch<{ id: string }>(`/projects/${id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({
          name,
          includeTasks: duplicateIncludeTasks,
          includeClients: duplicateIncludeClients,
        }),
      });
      success("Project duplicated");
      setDuplicateOpen(false);
      router.push(`/dashboard/projects/${created.id}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to duplicate project");
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete Project",
      message: "Permanently delete this project and all its data? This cannot be undone.",
      confirmLabel: "Delete",
      confirmText: project?.name ?? "",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/projects/${id}`, { method: "DELETE" });
      success("Project deleted");
      router.push("/dashboard/projects");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  if (!project) {
    if (error) {
      return (
        <Alert status="error" title="Could not load project">
          {error}
        </Alert>
      );
    }
    return <ProjectDetailSkeleton />;
  }

  const assignedIds = new Set((project.clients ?? []).map((c) => c.userId));

  const projectLabelIds = (project.labels ?? []).map((l) => l.label.id);

  const currentStatusObj = statuses.find((s) => s.slug === project.status);

  const sidebarDetails = (
    <>
      <ClientAssignment
        clients={clients}
        assignedIds={assignedIds}
        onToggle={handleClientToggle}
        onRemove={handleRemoveClient}
        onPreview={
          currentRole === "owner" || currentRole === "admin"
            ? handlePreviewAsClient
            : undefined
        }
        disabled={isArchived}
      />

      <Card className="space-y-4">
        {/* Labels */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className={SIDEBAR_HEADING}>
              <Tag className="size-3.5" aria-hidden />
              Labels
            </h2>
            <LabelPicker
              labels={orgLabels}
              assigned={projectLabelIds}
              onToggle={handleLabelToggle}
              onLabelsChange={setOrgLabels}
              disabled={isArchived}
            />
          </div>
          {projectLabelIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(project.labels ?? []).map((l) => (
                <LabelBadge key={l.label.id} name={l.label.name} color={l.label.color} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-card-border pt-4">
          <h2 className={SIDEBAR_HEADING}>
            <Calendar className="size-3.5" aria-hidden />
            Timeline
          </h2>
          <DateField
            label="Start"
            value={project.startDate ? project.startDate.slice(0, 10) : ""}
            onChange={(val) => handleDateChange("startDate", val)}
            disabled={isArchived}
          />
          <DateField
            label="End"
            value={project.endDate ? project.endDate.slice(0, 10) : ""}
            onChange={(val) => handleDateChange("endDate", val)}
            disabled={isArchived}
          />
          {project.endDate && !isArchived && (() => {
            const now = new Date();
            const end = new Date(project.endDate);
            const diffMs = end.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays < 0) {
              return (
                <p className="text-xs font-medium text-badge-error-text">
                  {Math.abs(diffDays)} day{Math.abs(diffDays) !== 1 ? "s" : ""} overdue
                </p>
              );
            }
            if (diffDays === 0) {
              return <p className="text-xs font-medium text-badge-warning-text">Due today</p>;
            }
            return (
              <p
                className={cn(
                  "text-xs font-medium",
                  diffDays <= 7 ? "text-badge-warning-text" : "text-text-tertiary",
                )}
              >
                {diffDays} day{diffDays !== 1 ? "s" : ""} left
              </p>
            );
          })()}
        </div>

        {(currentRole === "owner" || currentRole === "admin") && (
          <div id="default-rate" className="scroll-mt-24 space-y-2 border-t border-card-border pt-4">
            <h2 className={SIDEBAR_HEADING}>Default rate</h2>
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0 text-sm text-text-tertiary">$/hour</span>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="Member rate"
                defaultValue={
                  project.hourlyRateCents != null
                    ? (project.hourlyRateCents / 100).toString()
                    : ""
                }
                key={project.hourlyRateCents ?? "empty"}
                onBlur={(e) => handleRateChange(e.target.value)}
                disabled={isArchived}
                className="w-[140px] text-right sm:w-[170px]"
              />
            </div>
            <p className="text-xs text-text-tertiary">
              Overrides each member&apos;s default rate for time on this project.
            </p>
          </div>
        )}

        {isOwner && (
          <div className="border-t border-card-border pt-4">
            <Button variant="danger" appearance="ghost" size="sm" onClick={handleDelete}>
              <Trash2 />
              Delete project
            </Button>
          </div>
        )}
      </Card>
    </>
  );

  const tabBar = (
    <div className="flex max-w-full items-center gap-0 overflow-x-auto border-b border-card-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            data-testid={`project-tab-${tab.id}`}
            data-active={isActive}
            aria-current={isActive ? "page" : undefined}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 rounded-none text-sm font-medium whitespace-nowrap transition-colors outline-none",
              "focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring",
              isActive
                ? "-mb-px border-b-2 border-primary-500 px-4 py-3 text-neutral-brand-color"
                : "px-4 py-3 text-text-tertiary hover:text-text-primary",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  const tabContent = (
    <>
      {activeTab === "tasks" && (
        <TasksSection projectId={id} isArchived={isArchived} />
      )}
      {activeTab === "updates" && (
        <UpdatesSection
          projectId={id}
          isArchived={isArchived}
          onFileChange={loadProject}
          currentUserId={currentUserId}
          currentRole={currentRole}
        />
      )}
      {activeTab === "files" && (
        <FilesSection
          projectId={id}
          isArchived={isArchived}
          files={project.files}
          onFileChange={loadProject}
          projectClients={clients.filter((c) => assignedIds.has(c.userId))}
          currentRole={currentRole}
        />
      )}
      {activeTab === "time" && (
        <TimeTab projectId={id} isArchived={isArchived} />
      )}
      {activeTab === "contracts" && (
        <ContractsSection projectId={id} isArchived={isArchived} />
      )}
      {activeTab === "invoices" && (
        <InvoicesSection projectId={id} isArchived={isArchived} />
      )}
      {activeTab === "notes" && (
        <NotesSection projectId={id} isArchived={isArchived} />
      )}
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title={project.name}
        description={project.description || undefined}
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Projects", href: "/dashboard/projects" },
          { label: project.name },
        ]}
        actions={
          <>
            <StatusBadge status={project.status} label={currentStatusObj?.name} />
            {(currentRole === "owner" || currentRole === "admin") && (
              <Button appearance="outline" size="sm" onClick={openDuplicateModal}>
                <Copy />
                Duplicate
              </Button>
            )}
            {isArchived ? (
              <Button appearance="outline" size="sm" onClick={handleUnarchive}>
                <ArchiveRestore />
                Unarchive
              </Button>
            ) : (
              <Button appearance="outline" size="sm" onClick={handleArchive}>
                <Archive />
                Archive
              </Button>
            )}
          </>
        }
      />

      {error && (
        <Alert status="error" title="Could not load project">
          {error}
        </Alert>
      )}

      {isArchived && (
        <Alert status="warning" icon={<Archive className="size-4" />}>
          Archived. Editing disabled.
        </Alert>
      )}

      <div className="flex flex-col items-start gap-5 lg:flex-row">
        {/* Left sidebar — project metadata */}
        <aside className="w-full space-y-5 lg:sticky lg:top-8 lg:w-80 lg:shrink-0">
          {/* Mobile: collapsible details */}
          <details className="group overflow-hidden rounded-xl border-[0.5px] border-card-border bg-card-background lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 select-none [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-2">
                <StatusBadge status={project.status} label={currentStatusObj?.name} />
                <span className="text-xs text-text-tertiary">Details</span>
              </span>
              <ChevronDown
                size={14}
                className="shrink-0 text-icon-tertiary transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="space-y-5 border-t border-card-border bg-background-gray-secondary_alt_2 p-4">
              <StatusPipeline
                statuses={statuses}
                currentStatus={project.status}
                onStatusChange={handleStatusChange}
                disabled={isArchived}
              />
              {sidebarDetails}
            </div>
          </details>

          {/* Desktop: status pipeline + metadata cards */}
          <div className="hidden lg:block">
            <StatusPipeline
              statuses={statuses}
              currentStatus={project.status}
              onStatusChange={handleStatusChange}
              disabled={isArchived}
            />
          </div>
          <div className="hidden w-full space-y-5 lg:block">{sidebarDetails}</div>
        </aside>

        {/* Tabbed content area */}
        <div className="w-full min-w-0 flex-1 space-y-5">
          {tabBar}
          {tabContent}
        </div>
      </div>

      <Modal open={duplicateOpen} onClose={() => setDuplicateOpen(false)} size="md">
        <ModalHeader title="Duplicate Project" />
        <ModalBody className="space-y-4">
          <Field label="Name" htmlFor="duplicate-project-name">
            <Input
              id="duplicate-project-name"
              type="text"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              autoFocus
              maxLength={255}
            />
          </Field>
          <div className="space-y-2.5">
            <Checkbox
              id="duplicate-include-tasks"
              checked={duplicateIncludeTasks}
              onChange={(e) => setDuplicateIncludeTasks(e.target.checked)}
              label="Include tasks"
            />
            <Checkbox
              id="duplicate-include-clients"
              checked={duplicateIncludeClients}
              onChange={(e) => setDuplicateIncludeClients(e.target.checked)}
              label="Include client assignments"
            />
          </div>
          <p className="text-xs text-text-tertiary">
            Files, updates, invoices, and notes are not copied.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            appearance="outline"
            onClick={() => setDuplicateOpen(false)}
            disabled={duplicating}
          >
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={duplicating || !duplicateName.trim()}>
            {duplicating ? "Duplicating…" : "Duplicate"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
