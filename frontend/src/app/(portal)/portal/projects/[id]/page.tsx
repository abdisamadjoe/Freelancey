"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { cn, formatBytes, formatRelativeTime } from "@/lib/utils";
import { ProjectDetailSkeleton } from "@/components/skeletons";
import { Pagination } from "@/components/pagination";
import {
  Download,
  FileX,
  FileText,
  MessageSquare,
  ListTodo,
  Upload,
  Calendar,
  Vote,
  Lock,
  FileCheck,
  PenTool,
  Award,
  Ban,
  Clock,
  Plus,
  Paperclip,
  ExternalLink,
  Link as LinkIcon,
  Pencil,
} from "lucide-react";
import { PortalInvoicesSection } from "./components/portal-invoices-section";
import { PortalContractsSection } from "@/components/contracts/portal-contracts-section";
import { linkify } from "@/lib/linkify";
import { Embeds, type PreviewPrefs } from "@/lib/embeds";
import { downloadFile } from "@/lib/download";
import { SigningViewer } from "@/components/signing-viewer";
import { DocumentViewer } from "@/components/document-viewer";
import { useToast } from "@/components/toast";
import { CommentsSection } from "@/components/comments-section";
import { TaskDetailModal } from "@/components/task-detail-modal";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  buttonStyles,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageHeader,
  StatusBadge,
  Textarea,
} from "@/components/ui";

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

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  files: FileRecord[];
}

interface TimelineEntry {
  id: string;
  kind: "update" | "activity";
  createdAt: string;
  updatedAt?: string;
  // Update fields
  content?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  hasAttachment?: boolean;
  fileId?: string;
  previewPrefs?: PreviewPrefs | null;
  author?: { id: string; name: string };
  commentCount?: number;
  // Activity fields
  type?: string;
  action?: string;
  actor?: { id: string; name: string };
  targetId?: string;
  targetTitle?: string;
  detail?: string;
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface ProjectStatus {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
}

interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  dueDate?: string | null;
  status: string;
  requestedById?: string | null;
  assigneeId?: string | null;
  requester?: { id: string; name: string; image?: string | null } | null;
  assignee?: { id: string; name: string; image?: string | null } | null;
  order: number;
  type: string;
  question?: string;
  closedAt?: string | null;
  createdAt?: string;
  options?: {
    id: string;
    label: string;
    order: number;
    _count: { votes: number };
  }[];
  votes?: { optionId: string }[];
  labels?: { label: { id: string; name: string; color: string } }[];
  _count?: { votes: number; comments: number };
}

interface DocumentRecord {
  id: string;
  type: string;
  title: string;
  status: string;
  requiresSignature: boolean;
  requiresApproval: boolean;
  signedFileId?: string;
  signedFile?: { id: string; filename: string; sizeBytes: number };
  signatureFields?: { id: string }[];
  file: { id: string; filename: string; mimeType: string; sizeBytes: number };
  responses: { id: string; action: string; createdAt: string; fieldId?: string; reason?: string }[];
  createdAt: string;
  expiresAt?: string;
  voidReason?: string;
  options?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const docTypeLabels: Record<string, string> = {
  quote: "Quote",
  contract: "Contract",
  proposal: "Proposal",
  nda: "NDA",
  other: "Other",
};

const docActions: Record<string, string[]> = {
  quote: ["accepted", "declined"],
  contract: ["accepted", "declined"],
  proposal: ["accepted", "declined"],
  nda: ["accepted", "declined"],
  other: ["accepted", "declined"],
};

const tabs = [
  { id: "updates", label: "Updates" },
  { id: "tasks", label: "Tasks" },
  { id: "files", label: "Files" },
  { id: "contracts", label: "Contracts" },
  { id: "invoices", label: "Invoices" },
] as const;

type TabId = (typeof tabs)[number]["id"];

interface PendingDocAction {
  docId: string;
  docTitle: string;
  docType: string;
  action: string;
}

export default function PortalProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [updates, setUpdates] = useState<TimelineEntry[]>([]);
  const [updatesPage, setUpdatesPage] = useState(1);
  const [updatesTotalPages, setUpdatesTotalPages] = useState(1);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [tasksPage, setTasksPage] = useState(1);
  const [tasksTotalPages, setTasksTotalPages] = useState(1);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [docsPage, setDocsPage] = useState(1);
  const [docsTotalPages, setDocsTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some((t) => t.id === tabParam)) return tabParam as TabId;
    if (searchParams.get("task")) return "tasks";
    return "updates";
  });

  // When a ?task=<id> deep link is set, jump to the Tasks tab so the detail
  // modal can open (it's rendered inside the tasks tab).
  // When a ?tab=<id> deep link is set (e.g. from a notification email), jump to
  // it so the client lands on what the notification was about.
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam as TabId);
      return;
    }
    if (searchParams.get("task")) setActiveTab("tasks");
  }, [searchParams]);
  const [uploading, setUploading] = useState(false);
  const [signingDocId, setSigningDocId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [pendingDocAction, setPendingDocAction] = useState<PendingDocAction | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [selectedDocOptions, setSelectedDocOptions] = useState<Record<string, string>>({});
  const [showCompose, setShowCompose] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newRequestTitle, setNewRequestTitle] = useState("");
  const [newRequestDesc, setNewRequestDesc] = useState("");
  const [postingRequest, setPostingRequest] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Deep-link sync for task modal
  useEffect(() => {
    const t = searchParams.get("task");
    if (t) setOpenTaskId(t);
  }, [searchParams]);

  const updateTaskInUrl = useCallback(
    (taskId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (taskId) params.set("task", taskId);
      else params.delete("task");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const openTaskModal = (taskId: string) => {
    setOpenTaskId(taskId);
    updateTaskInUrl(taskId);
  };
  const closeTaskModal = () => {
    setOpenTaskId(null);
    updateTaskInUrl(null);
  };

  const loadProject = useCallback(() => {
    apiFetch<Project>(`/projects/mine/${id}`)
      .then(setProject)
      .catch((err) => setError(err.message || "Failed to load project"));
  }, [id]);

  const loadUpdates = useCallback(() => {
    apiFetch<PaginatedResponse<TimelineEntry>>(
      `/updates/timeline/mine/${id}?page=${updatesPage}&limit=10`,
    )
      .then((res) => {
        setUpdates(res.data);
        setUpdatesTotalPages(res.meta.totalPages);
      })
      .catch(console.error);
  }, [id, updatesPage]);

  const handlePrefsChange = async (updateId: string, next: PreviewPrefs) => {
    // Optimistic — prefs are display state, tolerate PATCH failures silently.
    setUpdates((prev) =>
      prev.map((e) => (e.id === updateId ? { ...e, previewPrefs: next } : e)),
    );
    try {
      await apiFetch(`/updates/${updateId}/preview-prefs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewPrefs: next }),
      });
    } catch (err) {
      console.error("Failed to save preview prefs", err);
    }
  };

  const loadTasks = useCallback(() => {
    apiFetch<PaginatedResponse<TaskRecord>>(
      `/tasks/mine/${id}?page=${tasksPage}&limit=20`,
    )
      .then((res) => {
        setTasks(res.data);
        setTasksTotalPages(res.meta.totalPages);
      })
      .catch(console.error);
  }, [id, tasksPage]);

  const loadDocuments = useCallback(() => {
    apiFetch<PaginatedResponse<DocumentRecord>>(`/documents/mine/${id}?page=${docsPage}&limit=20`)
      .then((res) => {
        setDocuments(res.data);
        setDocsTotalPages(res.meta.totalPages);
        // Track view for first pending document only (avoids N requests)
        const firstPending = res.data.find((d) => d.status === "pending");
        if (firstPending) {
          apiFetch(`/documents/${firstPending.id}/track-view`, { method: "POST" }).catch(() => {});
        }
      })
      .catch(console.error);
  }, [id, docsPage]);

  const handlePostUpdate = async () => {
    if (!newContent.trim()) return;
    setPostingUpdate(true);
    try {
      const formData = new FormData();
      formData.append("content", newContent);
      if (newAttachment) {
        formData.append("attachment", newAttachment);
      }
      await apiFetch(`/updates?projectId=${id}`, {
        method: "POST",
        body: formData,
      });
      setNewContent("");
      setNewAttachment(null);
      setShowCompose(false);
      loadUpdates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post update");
    } finally {
      setPostingUpdate(false);
    }
  };

  const handleStartEdit = (entry: TimelineEntry): void => {
    setEditingId(entry.id);
    setEditDraft(entry.content || "");
  };

  const handleCancelEdit = (): void => {
    setEditingId(null);
    setEditDraft("");
  };

  const handleSaveEdit = async (updateId: string): Promise<void> => {
    const content = editDraft.trim();
    if (!content) return;
    setSavingEdit(true);
    try {
      await apiFetch(`/updates/${updateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      toast.success("Update edited");
      setEditingId(null);
      setEditDraft("");
      loadUpdates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to edit update");
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePostRequest = async () => {
    if (!newRequestTitle.trim()) return;
    setPostingRequest(true);
    try {
      await apiFetch(`/tasks/mine?projectId=${id}`, {
        method: "POST",
        body: JSON.stringify({
          title: newRequestTitle,
          description: newRequestDesc || undefined,
        }),
      });
      setNewRequestTitle("");
      setNewRequestDesc("");
      setShowNewRequest(false);
      loadTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setPostingRequest(false);
    }
  };

  const openDocumentConfirm = (doc: DocumentRecord, action: string) => {
    setPendingDocAction({
      docId: doc.id,
      docTitle: doc.title,
      docType: doc.type,
      action,
    });
    setDeclineReason("");
  };

  const closeDocumentConfirm = () => {
    setPendingDocAction(null);
    setDeclineReason("");
  };

  const handleDocumentConfirm = async () => {
    if (!pendingDocAction) return;
    setConfirmSubmitting(true);
    try {
      const body: Record<string, string> = { action: pendingDocAction.action };
      if (pendingDocAction.action === "declined" && declineReason.trim()) {
        body.reason = declineReason.trim();
      }
      await apiFetch(`/documents/${pendingDocAction.docId}/respond`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const actionLabel = pendingDocAction.action === "accepted"
        ? "accepted"
        : "declined";
      toast.success(`Document "${pendingDocAction.docTitle}" ${actionLabel} successfully.`);
      setPendingDocAction(null);
      setDeclineReason("");
      loadDocuments();
      loadProject();
    } catch (err) {
      console.error(err);
      toast.error("Failed to respond to document. Please try again.");
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const handleDocumentRespond = async (docId: string, action: string, reason?: string) => {
    try {
      await apiFetch(`/documents/${docId}/respond`, {
        method: "POST",
        body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
      });
      loadDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    apiFetch<{ user: { id: string } }>("/organizations/me")
      .then((s) => setCurrentUserId(s.user.id))
      .catch((err) => {
        console.error(err);
        toast.error("Could not load your session. Some actions may be unavailable.");
      })
      .finally(() => setSessionLoaded(true));
  }, [toast]);

  useEffect(() => {
    loadProject();
    loadDocuments();
    apiFetch<ProjectStatus[]>("/projects/statuses")
      .then(setStatuses)
      .catch(console.error);
  }, [loadProject, loadDocuments]);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiFetch(`/files/upload/mine?projectId=${id}`, {
        method: "POST",
        body: formData,
      });
      loadProject();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      await downloadFile(fileId, filename);
    } catch (err) {
      console.error(err);
    }
  };

  if (!project) return <ProjectDetailSkeleton />;

  const currentIndex = statuses.findIndex((s) => s.slug === project.status);
  const pendingDocs = documents.filter(
    (d) => d.status === "pending" && d.responses.length === 0,
  );

  const closeCompose = () => {
    setShowCompose(false);
    setNewContent("");
    setNewAttachment(null);
  };

  const closeNewRequest = () => {
    setShowNewRequest(false);
    setNewRequestTitle("");
    setNewRequestDesc("");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={project.name}
        description={project.description}
        breadcrumbs={[
          { label: "Your Projects", href: "/portal/projects" },
          { label: project.name },
        ]}
      />

      {error && <Alert status="error" title={error} />}

      <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
        {/* Left sidebar */}
        <aside className="w-full space-y-5 lg:sticky lg:top-6 lg:w-72 lg:shrink-0 lg:self-start">
          <Card className="space-y-4">
            <StatusBadge status={project.status} />
            {/* Progress pipeline */}
            <div className="flex flex-wrap gap-1">
              {statuses.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex-1 overflow-hidden rounded-md px-0.5 py-1.5 text-center text-[10px] font-medium text-ellipsis whitespace-nowrap",
                    i <= currentIndex
                      ? "text-white-100"
                      : "bg-background-gray-secondary text-text-tertiary",
                  )}
                  style={i <= currentIndex ? { backgroundColor: s.color } : undefined}
                >
                  {s.name}
                </div>
              ))}
            </div>
          </Card>

          {/* Timeline */}
          {(project.startDate || project.endDate) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="size-4 text-icon-tertiary" aria-hidden />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {project.startDate && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-tertiary">Start</span>
                    <span className="text-text-primary">
                      {formatDateDisplay(project.startDate)}
                    </span>
                  </div>
                )}
                {project.endDate && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-text-tertiary">End</span>
                    <span className="text-text-primary">
                      {formatDateDisplay(project.endDate)}
                    </span>
                  </div>
                )}
                {project.endDate && (() => {
                  const end = new Date(project.endDate);
                  const diffDays = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  if (diffDays < 0) {
                    return (
                      <p className="text-xs font-medium text-button-error-outline-text">
                        {Math.abs(diffDays)} day{Math.abs(diffDays) !== 1 ? "s" : ""} overdue
                      </p>
                    );
                  }
                  if (diffDays === 0) {
                    return (
                      <p className="text-xs font-medium text-badge-warning-text">Due today</p>
                    );
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
              </CardContent>
            </Card>
          )}
        </aside>

        {/* Right content area -- tabbed sections */}
        <div className="min-w-0 flex-1 space-y-5">
          {/* Pending actions banner */}
          {pendingDocs.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("files")}
              className="block w-full text-left"
            >
              <Alert
                status="warning"
                title={`${pendingDocs.length === 1 ? "1 document needs" : `${pendingDocs.length} documents need`} your attention`}
                icon={<span className="text-sm font-medium">{pendingDocs.length}</span>}
              >
                {pendingDocs.length} document{pendingDocs.length > 1 ? "s" : ""} to review
              </Alert>
            </button>
          )}

          {/* Tab bar — the template's underlined section tabs */}
          <div>
            <div className="flex max-w-full items-center gap-0 overflow-x-auto border-b border-card-border">
              {tabs.map((tab) => {
                const pendingCount = tab.id === "files"
                  ? documents.filter((d) => d.status === "pending" && d.responses.length === 0).length
                  : 0;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring sm:px-4",
                      isActive
                        ? "-mb-px border-b-2 border-primary-500 text-neutral-brand-color"
                        : "text-text-tertiary hover:text-text-primary",
                    )}
                  >
                    {tab.label}
                    {pendingCount > 0 && (
                      <Badge color="warning">{pendingCount}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Updates Tab */}
          {activeTab === "updates" && (
            <div className="space-y-4">
              <div>
                <Button size="sm" onClick={() => setShowCompose(true)}>
                  <Plus aria-hidden />
                  Add Update
                </Button>
              </div>

              <div className="space-y-4">
                {updates.map((entry) => {
                  if (entry.kind === "activity") {
                    const actorName = entry.actor?.name || "Someone";
                    const actionLabels: Record<string, string> = {
                      accepted: "accepted",
                      declined: "declined",
                      acknowledged: "acknowledged",
                      signed: "signed",
                      voted: "voted on",
                      closed: "closed voting on",
                    };
                    const label = actionLabels[entry.action || ""] || entry.action;

                    return (
                      <Card
                        key={entry.id}
                        data-testid="activity-entry"
                        className="flex items-start gap-3 p-4"
                      >
                        <div className="mt-0.5 shrink-0 text-icon-tertiary [&>svg]:size-4">
                          {entry.type === "document_response" && <FileCheck />}
                          {entry.type === "decision_vote" && <Vote />}
                          {entry.type === "decision_closed" && <Lock />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-text-secondary">
                            <span className="font-medium text-text-primary">{actorName}</span>
                            {" "}
                            <span>{label}</span>
                            {" "}
                            <span className="font-medium text-text-primary">{entry.targetTitle}</span>
                            {entry.detail && (
                              <span> &mdash; {entry.detail}</span>
                            )}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <StatusBadge status={entry.action} withDot={false} />
                            <span className="text-xs text-text-tertiary">
                              {formatRelativeTime(entry.createdAt)}
                            </span>
                          </div>
                        </div>
                      </Card>
                    );
                  }

                  // Regular update entry
                  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
                  const isImage = IMAGE_TYPES.has(entry.attachmentMimeType || "");
                  const attachmentSrc = entry.fileId
                    ? `${API_URL}/api/files/${entry.fileId}/download`
                    : entry.attachmentUrl || `${API_URL}/api/updates/${entry.id}/attachment`;
                  const isOwnUpdate =
                    sessionLoaded &&
                    currentUserId !== null &&
                    entry.author?.id === currentUserId;
                  const isEditing = editingId === entry.id;
                  const wasEdited =
                    !!entry.updatedAt &&
                    new Date(entry.updatedAt).getTime() -
                      new Date(entry.createdAt).getTime() >
                      2 * 60 * 1000;
                  return (
                    <Card key={entry.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar name={entry.author?.name || "Unknown"} size={24} />
                          <span className="truncate text-sm font-medium text-text-primary">
                            {entry.author?.name}
                          </span>
                          <span className="text-xs text-text-tertiary">
                            {formatRelativeTime(entry.createdAt)}
                          </span>
                          {wasEdited && (
                            <span
                              data-testid="update-edited-indicator"
                              className="text-xs text-text-tertiary italic"
                            >
                              (edited)
                            </span>
                          )}
                        </div>
                        {isOwnUpdate && !isEditing && (
                          <Button
                            type="button"
                            variant="ghost"
                            appearance="ghost"
                            size="xs"
                            onClick={() => handleStartEdit(entry)}
                            aria-label="Edit update"
                            data-testid={`edit-update-${entry.id}`}
                          >
                            <Pencil aria-hidden />
                            Edit
                          </Button>
                        )}
                      </div>

                      <CardContent>
                        {isEditing ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              maxLength={5000}
                              rows={4}
                              autoFocus
                              data-testid={`edit-update-textarea-${entry.id}`}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                appearance="outline"
                                size="xs"
                                onClick={handleCancelEdit}
                                disabled={savingEdit}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                onClick={() => handleSaveEdit(entry.id)}
                                disabled={savingEdit || !editDraft.trim()}
                                data-testid={`save-update-${entry.id}`}
                              >
                                {savingEdit ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm leading-6 whitespace-pre-wrap text-text-secondary">
                              {linkify(entry.content || "")}
                            </p>
                            <Embeds
                              text={entry.content || ""}
                              prefs={entry.previewPrefs ?? undefined}
                              onPrefsChange={(next) => handlePrefsChange(entry.id, next)}
                            />
                          </>
                        )}

                        {entry.hasAttachment && isImage && (
                          <img
                            src={attachmentSrc}
                            alt=""
                            className="mt-3 max-h-80 max-w-full rounded-lg border-[0.5px] border-card-border"
                          />
                        )}
                        {entry.hasAttachment && !isImage && (
                          <Button
                            type="button"
                            appearance="outline"
                            onClick={() =>
                              entry.fileId
                                ? handleDownload(entry.fileId, entry.attachmentName || "download")
                                : window.open(attachmentSrc, "_blank")
                            }
                            className="mt-3 w-full justify-between sm:w-fit"
                          >
                            <FileText aria-hidden />
                            <span className="min-w-0 flex-1 truncate text-left">
                              {entry.attachmentName || "Download"}
                            </span>
                            <Download aria-hidden />
                          </Button>
                        )}
                      </CardContent>

                      <CommentsSection
                        targetType="update"
                        targetId={entry.id}
                        commentCount={entry.commentCount ?? 0}
                      />
                    </Card>
                  );
                })}
                {updates.length === 0 && (
                  <EmptyState
                    icon={MessageSquare}
                    title="No updates shared yet."
                  />
                )}
              </div>
              <Pagination page={updatesPage} totalPages={updatesTotalPages} onPageChange={setUpdatesPage} />
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === "tasks" && (() => {
            const hiddenCount = tasks.filter(
              (t) => t.status === "done" || t.status === "cancelled",
            ).length;
            const visibleTasks = showCompletedTasks
              ? tasks
              : tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button size="sm" onClick={() => setShowNewRequest(true)}>
                    <Plus aria-hidden />
                    New Request
                  </Button>
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCompletedTasks((v) => !v)}
                      className="text-xs font-medium text-text-tertiary underline transition-colors hover:text-text-primary"
                    >
                      {showCompletedTasks
                        ? `Hide done/cancelled (${hiddenCount})`
                        : `Show done/cancelled (${hiddenCount})`}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {visibleTasks.map((task) => {
                    if (task.type === "decision") {
                      const isClosed = !!task.closedAt;
                      const totalVotes = task._count?.votes ?? 0;
                      const hasVoted = !!task.votes?.[0];

                      return (
                        <div
                          key={task.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openTaskModal(task.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openTaskModal(task.id);
                            }
                          }}
                          data-testid={`task-row-${task.id}`}
                          className="flex cursor-pointer flex-wrap items-center gap-2 rounded-xl border-[0.5px] border-card-border bg-card-background px-4 py-3 transition-colors outline-none hover:bg-background-gray-secondary_alt focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring"
                        >
                          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-badge-primary-background text-neutral-brand-color">
                            <Vote className="size-3" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1 text-sm break-words text-text-primary">
                            {task.question || task.title}
                          </span>
                          {isClosed ? (
                            <span className="flex shrink-0 items-center gap-1 text-xs text-text-tertiary">
                              <Lock className="size-3" aria-hidden />
                              Closed
                            </span>
                          ) : !hasVoted ? (
                            <Badge color="warning">Needs vote</Badge>
                          ) : null}
                          {totalVotes > 0 && (
                            <span className="shrink-0 text-xs text-text-tertiary">
                              {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                            </span>
                          )}
                          {task._count && task._count.comments > 0 && (
                            <span className="flex shrink-0 items-center gap-1 text-xs text-text-tertiary">
                              <MessageSquare className="size-3" aria-hidden />
                              {task._count.comments}
                            </span>
                          )}
                        </div>
                      );
                    }

                    // Checkbox / request task — clickable row opens detail modal
                    const isOwnRequest = sessionLoaded && currentUserId !== null && task.requestedById === currentUserId;

                    return (
                      <div
                        key={task.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openTaskModal(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openTaskModal(task.id);
                          }
                        }}
                        data-testid={`task-row-${task.id}`}
                        className="flex cursor-pointer flex-wrap items-center gap-2 rounded-xl border-[0.5px] border-card-border bg-card-background px-4 py-3 transition-colors outline-none hover:bg-background-gray-secondary_alt focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring"
                      >
                        <StatusBadge status={task.status} className="shrink-0" />
                        <span
                          className={cn(
                            "min-w-0 flex-1 break-words text-sm",
                            task.status === "done" || task.status === "cancelled"
                              ? "text-text-tertiary line-through"
                              : "text-text-primary",
                          )}
                        >
                          <span className="break-words">{task.title}</span>
                          {isOwnRequest && (
                            <Badge color="warning" className="ml-2 align-middle">
                              Your request
                            </Badge>
                          )}
                          {!isOwnRequest && task.requester && (
                            <span className="ml-2 align-middle text-xs text-text-tertiary">
                              • {task.requester.name}
                            </span>
                          )}
                        </span>
                        {task._count && task._count.comments > 0 && (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-text-tertiary">
                            <MessageSquare className="size-3" aria-hidden />
                            {task._count.comments}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="shrink-0 text-xs text-text-tertiary">
                            {formatDateDisplay(task.dueDate)}
                          </span>
                        )}
                        {task.assignee && (
                          <span className="shrink-0" title={task.assignee.name}>
                            <Avatar
                              name={task.assignee.name}
                              image={task.assignee.image}
                              size={22}
                            />
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {visibleTasks.length === 0 && (
                    <EmptyState
                      icon={ListTodo}
                      title={tasks.length === 0 ? "No tasks yet." : "No active tasks."}
                    />
                  )}
                </div>
                <Pagination page={tasksPage} totalPages={tasksTotalPages} onPageChange={setTasksPage} />
              </div>
            );
          })()}

          {/* Files Tab */}
          {activeTab === "files" && (() => {
            const sortedFiles = [...project.files].sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            return (
              <div className="space-y-5">
                <div className="flex justify-end">
                  <label
                    className={cn(
                      buttonStyles({ size: "sm" }),
                      "cursor-pointer",
                      uploading && "pointer-events-none",
                    )}
                  >
                    <Upload aria-hidden />
                    {uploading ? "Uploading..." : "Upload File"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>

                <Card className="overflow-hidden p-0">
                  {sortedFiles.map((file) => {
                    const isLink = file.type === "LINK";
                    let hostname = "";
                    if (isLink && file.url) {
                      try { hostname = new URL(file.url).hostname; } catch { hostname = file.url; }
                    }
                    const handleCardClick = () => {
                      if (isLink && file.url) {
                        window.open(file.url, "_blank", "noopener,noreferrer");
                      } else {
                        handleDownload(file.id, file.filename);
                      }
                    };
                    return (
                      <div
                        key={file.id}
                        role="button"
                        tabIndex={0}
                        onClick={handleCardClick}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleCardClick();
                          }
                        }}
                        className="flex cursor-pointer items-start justify-between gap-3 border-b border-border-primary px-5 py-3.5 transition-colors outline-none last:border-b-0 hover:bg-background-gray-secondary_alt focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring"
                      >
                        <div className="flex min-w-0 items-start gap-2.5">
                          {isLink ? (
                            <LinkIcon className="mt-0.5 size-4 shrink-0 text-icon-tertiary" aria-hidden />
                          ) : (
                            <FileText className="mt-0.5 size-4 shrink-0 text-icon-tertiary" aria-hidden />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {file.filename}
                            </p>
                            <p className="text-xs text-text-tertiary">
                              {isLink ? hostname : formatBytes(file.sizeBytes ?? 0)}
                            </p>
                            {isLink && file.description && (
                              <p className="mt-1 text-xs text-text-tertiary">{file.description}</p>
                            )}
                          </div>
                        </div>
                        {isLink ? (
                          <ExternalLink className="size-4 shrink-0 text-icon-tertiary" aria-hidden />
                        ) : (
                          <Download className="size-4 shrink-0 text-icon-tertiary" aria-hidden />
                        )}
                      </div>
                    );
                  })}
                  {project.files.length === 0 && documents.length === 0 && (
                    <EmptyState variant="plain" icon={FileX} title="No files shared yet." />
                  )}
                </Card>

                {/* Documents section */}
                {documents.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-t border-card-border pt-4">
                      <FileCheck className="size-4 text-icon-tertiary" aria-hidden />
                      <h3 className="text-base leading-6 font-semibold tracking-[-0.2px] text-text-primary">
                        Documents
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {documents.map((doc) => {
                        const isVoided = doc.status === "voided";
                        const isExpired = doc.status === "expired";
                        const isReadOnly = isVoided || isExpired;

                        // Approval responses (non-signing)
                        const approvalResponses = doc.responses.filter((r) => r.action !== "signed");
                        const hasResponded = approvalResponses.length > 0;
                        const lastResponse = hasResponded ? approvalResponses[0] : null;

                        // Check if this document requires signing and has unsigned fields
                        const needsSigning = doc.requiresSignature &&
                          doc.signatureFields &&
                          doc.signatureFields.length > 0;
                        const signedFieldIds = doc.responses
                          .filter((r) => r.action === "signed" && r.fieldId)
                          .map((r) => r.fieldId);
                        const allFieldsSigned = needsSigning &&
                          doc.signatureFields!.every((f) => signedFieldIds.includes(f.id));
                        const hasUnsignedFields = needsSigning && !allFieldsSigned && !isReadOnly;

                        // Options — format: "question|choice1,choice2" or "choice1,choice2"
                        const hasQuestionSep = doc.options?.includes("|");
                        const optionsQuestion = hasQuestionSep ? doc.options!.split("|")[0] : null;
                        const optionsRaw = hasQuestionSep ? doc.options!.split("|")[1] : doc.options;
                        const docOptionsList = optionsRaw ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean) : [];
                        const hasOptions = docOptionsList.length > 0;
                        const selectedOption = selectedDocOptions[doc.id] || lastResponse?.reason || "";

                        return (
                          <Card
                            key={doc.id}
                            className={cn("space-y-3", isReadOnly && "opacity-60")}
                          >
                            {/* Header row */}
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => setViewingDoc(doc)}
                                className="min-w-0 flex-1 text-left"
                                data-testid={`view-document-${doc.id}`}
                              >
                                <p className="truncate text-sm font-medium text-text-primary transition-colors hover:text-neutral-brand-color">
                                  {doc.title}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                  <Badge color="gray">
                                    {docTypeLabels[doc.type] || doc.type}
                                  </Badge>
                                  <span className="text-xs text-text-tertiary">
                                    {formatBytes(doc.file.sizeBytes)}
                                  </span>
                                  {doc.expiresAt && !isExpired && (
                                    <span className="flex items-center gap-1 text-xs text-badge-warning-text">
                                      <Clock className="size-3" aria-hidden />
                                      Expires {new Date(doc.expiresAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </button>
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  appearance="ghost"
                                  size="xs"
                                  aria-label="Download document"
                                  onClick={() => handleDownload(doc.file.id, doc.file.filename)}
                                >
                                  <Download aria-hidden />
                                </Button>
                                {doc.status === "signed" && (
                                  <Button
                                    type="button"
                                    variant="success"
                                    appearance="ghost"
                                    size="xs"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(
                                          `${process.env.NEXT_PUBLIC_API_URL || ""}/api/documents/${doc.id}/certificate`,
                                          { credentials: "include" },
                                        );
                                        if (!response.ok) throw new Error("Failed");
                                        const blob = await response.blob();
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = `certificate-${doc.id.slice(0, 8)}.pdf`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                      } catch {
                                        console.error("Failed to download certificate");
                                      }
                                    }}
                                  >
                                    <Award aria-hidden />
                                    Certificate
                                  </Button>
                                )}
                                {isVoided && (
                                  <Badge color="error">
                                    <Ban aria-hidden /> Voided
                                  </Badge>
                                )}
                                {isExpired && (
                                  <Badge color="gray">
                                    <Clock aria-hidden /> Expired
                                  </Badge>
                                )}
                                {!isReadOnly && !hasOptions && (
                                  <>
                                    {doc.requiresApproval && hasResponded && lastResponse ? (
                                      <StatusBadge status={lastResponse.action} withDot={false} />
                                    ) : (
                                      <>
                                        {doc.requiresApproval && !hasResponded && (
                                          <>
                                            <Button
                                              type="button"
                                              variant="success"
                                              size="xs"
                                              onClick={() => openDocumentConfirm(doc, "accepted")}
                                            >
                                              Accept
                                            </Button>
                                            <Button
                                              type="button"
                                              variant="danger"
                                              size="xs"
                                              onClick={() => openDocumentConfirm(doc, "declined")}
                                            >
                                              Decline
                                            </Button>
                                          </>
                                        )}
                                        {hasUnsignedFields && (
                                          <Button
                                            type="button"
                                            size="xs"
                                            onClick={() => setSigningDocId(doc.id)}
                                          >
                                            <PenTool aria-hidden /> Review &amp; Sign
                                          </Button>
                                        )}
                                        {allFieldsSigned && (
                                          <StatusBadge status="signed" withDot={false} />
                                        )}
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Radio options — shown when document has options */}
                            {hasOptions && !isReadOnly && (
                              <div className="space-y-3 border-t border-card-border pt-3">
                                {optionsQuestion && (
                                  <p className="text-sm font-medium text-text-primary">{optionsQuestion}</p>
                                )}
                                {hasResponded && lastResponse?.reason ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm text-text-tertiary">Selected:</span>
                                    <Badge color="primary">{lastResponse.reason}</Badge>
                                  </div>
                                ) : (
                                  <>
                                    <div className="space-y-1.5">
                                      {docOptionsList.map((option) => (
                                        <label
                                          key={option}
                                          className={cn(
                                            "flex cursor-pointer items-center gap-3 rounded-lg border-[0.5px] px-3 py-2.5 transition-colors",
                                            selectedOption === option
                                              ? "border-input-primary-focus-border bg-badge-primary-background"
                                              : "border-card-border hover:bg-background-gray-secondary_alt",
                                          )}
                                        >
                                          <input
                                            type="radio"
                                            name={`doc-option-${doc.id}`}
                                            value={option}
                                            checked={selectedOption === option}
                                            onChange={() => setSelectedDocOptions((prev) => ({ ...prev, [doc.id]: option }))}
                                            className="accent-neutral-brand-color"
                                          />
                                          <span className="text-sm text-text-primary">{option}</span>
                                        </label>
                                      ))}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={async () => {
                                          const selected = selectedDocOptions[doc.id];
                                          if (!selected) return;
                                          try {
                                            await apiFetch(`/documents/${doc.id}/respond`, {
                                              method: "POST",
                                              body: JSON.stringify({ action: "accepted", reason: selected }),
                                            });
                                            toast.success(`Selection "${selected}" submitted.`);
                                            setSelectedDocOptions((prev) => { const next = { ...prev }; delete next[doc.id]; return next; });
                                            loadDocuments();
                                          } catch (err) {
                                            toast.error("Failed to submit selection.");
                                          }
                                        }}
                                        disabled={!selectedDocOptions[doc.id]}
                                      >
                                        Submit Selection
                                      </Button>
                                      {doc.requiresApproval && (
                                        <>
                                          <Button
                                            type="button"
                                            variant="success"
                                            size="xs"
                                            onClick={() => openDocumentConfirm(doc, "accepted")}
                                          >
                                            Accept
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="danger"
                                            size="xs"
                                            onClick={() => openDocumentConfirm(doc, "declined")}
                                          >
                                            Decline
                                          </Button>
                                        </>
                                      )}
                                      {hasUnsignedFields && (
                                        <Button
                                          type="button"
                                          size="xs"
                                          onClick={() => setSigningDocId(doc.id)}
                                        >
                                          <PenTool aria-hidden /> Review &amp; Sign
                                        </Button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                    {docsTotalPages > 1 && (
                      <Pagination page={docsPage} totalPages={docsTotalPages} onPageChange={setDocsPage} />
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Contracts Tab */}
          {activeTab === "contracts" && (
            <PortalContractsSection projectId={id} />
          )}

          {/* Invoices Tab */}
          {activeTab === "invoices" && (
            <PortalInvoicesSection projectId={id} />
          )}
        </div>
      </div>

      {/* Compose Update Modal */}
      <Modal open={showCompose} onClose={closeCompose} size="md">
        <ModalHeader title="Post Update" />
        <ModalBody className="space-y-4">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write an update..."
            maxLength={5000}
            rows={4}
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className={cn(buttonStyles({ appearance: "outline", size: "sm" }), "cursor-pointer")}>
              <Paperclip aria-hidden />
              Attach File
              <input
                type="file"
                className="hidden"
                onChange={(e) => setNewAttachment(e.target.files?.[0] ?? null)}
              />
            </label>
            {newAttachment && (
              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                {newAttachment.name}
                <button
                  type="button"
                  onClick={() => setNewAttachment(null)}
                  aria-label="Remove attachment"
                  className="text-icon-tertiary transition-colors hover:text-button-error-outline-text"
                >
                  &times;
                </button>
              </span>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button appearance="outline" onClick={closeCompose}>
            Cancel
          </Button>
          <Button
            onClick={handlePostUpdate}
            disabled={postingUpdate || !newContent.trim()}
          >
            {postingUpdate ? "Posting..." : "Post"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* New Request Modal */}
      <Modal open={showNewRequest} onClose={closeNewRequest} size="md">
        <ModalHeader title="New Request" />
        <ModalBody className="space-y-4">
          <Input
            type="text"
            value={newRequestTitle}
            onChange={(e) => setNewRequestTitle(e.target.value)}
            placeholder="What do you need?"
            maxLength={255}
            autoFocus
          />
          <Textarea
            value={newRequestDesc}
            onChange={(e) => setNewRequestDesc(e.target.value)}
            placeholder="More details (optional)..."
            maxLength={5000}
            rows={3}
          />
        </ModalBody>
        <ModalFooter>
          <Button appearance="outline" onClick={closeNewRequest}>
            Cancel
          </Button>
          <Button
            onClick={handlePostRequest}
            disabled={postingRequest || !newRequestTitle.trim()}
          >
            {postingRequest ? "Submitting..." : "Submit"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Task Detail Modal */}
      {openTaskId && (() => {
        const t = tasks.find((x) => x.id === openTaskId);
        if (!t) return null;
        return (
          <TaskDetailModal
            task={t}
            viewer="client"
            currentUserId={currentUserId}
            onClose={closeTaskModal}
            onChange={loadTasks}
          />
        );
      })()}

      {/* Signing Viewer Modal */}
      {signingDocId && (
        <SigningViewer
          documentId={signingDocId}
          onClose={() => setSigningDocId(null)}
          onSigned={() => {
            setSigningDocId(null);
            loadDocuments();
          }}
        />
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <DocumentViewer
          documentId={viewingDoc.id}
          title={viewingDoc.title}
          typeLabel={docTypeLabels[viewingDoc.type] || viewingDoc.type}
          mimeType={viewingDoc.file.mimeType}
          fileId={viewingDoc.file.id}
          filename={viewingDoc.file.filename}
          hasResponded={viewingDoc.requiresApproval && viewingDoc.responses.filter((r) => r.action !== "signed").length > 0}
          lastResponseAction={viewingDoc.responses.filter((r) => r.action !== "signed")[0]?.action}
          actions={viewingDoc.requiresApproval ? (docActions[viewingDoc.type] || ["accepted", "declined"]) : []}
          onRespond={async (action, reason) => {
            await handleDocumentRespond(viewingDoc.id, action, reason);
          }}
          onClose={() => setViewingDoc(null)}
        />
      )}

      {/* Document Response Confirmation Dialog */}
      <Modal
        open={pendingDocAction !== null}
        onClose={closeDocumentConfirm}
        size="sm"
        closeOnBackdrop={!confirmSubmitting}
      >
        {pendingDocAction && (
          <>
            <ModalHeader
              title={
                pendingDocAction.action === "accepted"
                  ? "Accept Document"
                  : "Decline Document"
              }
            />
            <ModalBody className="space-y-3">
              <p className="text-sm leading-5 text-text-tertiary">
                Are you sure you want to{" "}
                <span className="font-medium text-text-primary">
                  {pendingDocAction.action === "accepted" ? "accept" : "decline"}
                </span>{" "}
                this document?
              </p>
              <div className="rounded-lg border-[0.5px] border-card-border bg-background-gray-primary p-3">
                <p className="text-sm font-medium text-text-primary">{pendingDocAction.docTitle}</p>
                <div className="mt-1.5">
                  <Badge color="gray">
                    {docTypeLabels[pendingDocAction.docType] || pendingDocAction.docType}
                  </Badge>
                </div>
              </div>
              {pendingDocAction.action === "declined" && (
                <Field label="Reason for declining (optional)" htmlFor="portal-decline-reason">
                  <Textarea
                    id="portal-decline-reason"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Provide a reason for declining..."
                    rows={3}
                  />
                </Field>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                appearance="outline"
                onClick={closeDocumentConfirm}
                disabled={confirmSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant={pendingDocAction.action === "declined" ? "danger" : "primary"}
                onClick={handleDocumentConfirm}
                disabled={confirmSubmitting}
              >
                {confirmSubmitting
                  ? "Submitting..."
                  : pendingDocAction.action === "accepted"
                    ? "Confirm Accept"
                    : "Confirm Decline"}
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}
