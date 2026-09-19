"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import { Pagination } from "@/components/pagination";
import {
  Trash2,
  Plus,
  MessageSquare,
  Paperclip,
  FileText,
  Download,
  FileCheck,
  Vote,
  Lock,
  Pencil,
} from "lucide-react";
import { linkify } from "@/lib/linkify";
import { Embeds, type PreviewPrefs } from "@/lib/embeds";
import { track } from "@/lib/track";
import { CommentsSection } from "@/components/comments-section";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  buttonStyles,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Textarea,
  UpdateItemSkeleton,
} from "@/components/ui";
import type { BadgeColor } from "@/components/ui";
import { cn } from "@/lib/utils";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

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

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const actionLabels: Record<string, string> = {
  accepted: "accepted",
  declined: "declined",
  acknowledged: "acknowledged",
  signed: "signed",
  voted: "voted on",
  closed: "closed voting on",
};

/** Actions mapped onto the shared badge palette (no ad-hoc colours). */
const actionColors: Record<string, BadgeColor> = {
  accepted: "success",
  declined: "error",
  acknowledged: "blue",
  signed: "cyan",
  voted: "warning",
  closed: "gray",
};

function ActivityIcon({ type }: { type?: string }) {
  switch (type) {
    case "document_response":
      return <FileCheck size={14} className="text-badge-blue-text" />;
    case "decision_vote":
      return <Vote size={14} className="text-badge-warning-text" />;
    case "decision_closed":
      return <Lock size={14} className="text-icon-tertiary" />;
    default:
      return <MessageSquare size={14} className="text-icon-tertiary" />;
  }
}

export function UpdatesSection({
  projectId,
  isArchived,
  onFileChange,
  currentUserId = null,
  currentRole = null,
}: {
  projectId: string;
  isArchived: boolean;
  onFileChange?: () => void;
  currentUserId?: string | null;
  currentRole?: string | null;
}) {
  const confirm = useConfirm();
  const { success, error: showError } = useToast();
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newContent, setNewContent] = useState("");
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isPrivileged = currentRole === "owner" || currentRole === "admin";

  const loadTimeline = useCallback(() => {
    setLoading(true);
    apiFetch<PaginatedResponse<TimelineEntry>>(
      `/updates/timeline/${projectId}?page=${page}&limit=10`,
    )
      .then((res) => {
        setTimeline(res.data);
        setTotalPages(res.meta.totalPages);
        setLoadError(null);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err instanceof Error ? err.message : "Failed to load updates");
      })
      .finally(() => setLoading(false));
  }, [projectId, page]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const closeCompose = () => {
    setShowCompose(false);
    setNewContent("");
    setNewAttachment(null);
  };

  const startEdit = (entry: TimelineEntry): void => {
    setEditingId(entry.id);
    setEditDraft(entry.content || "");
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditDraft("");
  };

  const saveEdit = async (updateId: string): Promise<void> => {
    const content = editDraft.trim();
    if (!content) return;
    setEditSaving(true);
    try {
      await apiFetch(`/updates/${updateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setEditingId(null);
      setEditDraft("");
      loadTimeline();
      success("Update edited");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to edit update");
    } finally {
      setEditSaving(false);
    }
  };

  const handlePost = async () => {
    if (!newContent.trim()) return;
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("content", newContent);
      if (newAttachment) {
        formData.append("attachment", newAttachment);
      }
      await apiFetch(`/updates?projectId=${projectId}`, {
        method: "POST",
        body: formData,
      });
      track("update_posted", { has_attachment: !!newAttachment });
      setNewContent("");
      setNewAttachment(null);
      setShowCompose(false);
      loadTimeline();
      onFileChange?.();
      success("Update posted");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to post update");
    } finally {
      setPosting(false);
    }
  };

  const handleAttachmentDownload = async (fileId: string, filename: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/files/${fileId}/download`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to download file");
    }
  };

  const handlePrefsChange = async (updateId: string, next: PreviewPrefs) => {
    // Optimistic update — server errors are silent (prefs are a display hint).
    setTimeline((prev) =>
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

  const handleDelete = async (updateId: string) => {
    const ok = await confirm({
      title: "Delete Update",
      message: "Delete this update? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/updates/${updateId}`, { method: "DELETE" });
      loadTimeline();
      onFileChange?.();
      success("Update deleted");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete update");
    }
  };

  const showSkeleton = loading && timeline.length === 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Updates</CardTitle>
          {!isArchived && (
            <CardAction>
              <Button onClick={() => setShowCompose(true)}>
                <Plus />
                Add Update
              </Button>
            </CardAction>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {loadError ? (
            <Alert
              status="error"
              title="Could not load updates"
              actions={
                <Button appearance="outline" size="sm" onClick={() => loadTimeline()}>
                  Retry
                </Button>
              }
            >
              {loadError}
            </Alert>
          ) : showSkeleton ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <UpdateItemSkeleton key={index} />
              ))}
            </div>
          ) : timeline.length === 0 ? (
            <EmptyState
              variant="plain"
              icon={<MessageSquare className="size-5" aria-hidden />}
              title="No updates posted yet."
              className="py-8"
            />
          ) : (
            <div className="space-y-3">
              {timeline.map((entry) => {
                if (entry.kind === "activity") {
                  const color = actionColors[entry.action || ""] ?? actionColors.closed;
                  const actorName = entry.actor?.name || "Someone";
                  const label = actionLabels[entry.action || ""] || entry.action;

                  return (
                    <div
                      key={entry.id}
                      data-testid="activity-entry"
                      className="flex items-start gap-3 rounded-lg border-[0.5px] border-card-border bg-card-surface-area px-4 py-3"
                    >
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-gray-secondary_alt">
                        <ActivityIcon type={entry.type} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-secondary">
                          <span className="font-medium text-text-primary">{actorName}</span>
                          {" "}
                          <span>{label}</span>
                          {" "}
                          <span className="font-medium text-text-primary">{entry.targetTitle}</span>
                          {entry.detail && <span> &mdash; {entry.detail}</span>}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge color={color}>{entry.action}</Badge>
                          <span className="text-xs text-text-tertiary">
                            {formatRelativeTime(entry.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Regular update entry
                const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
                const isImage = IMAGE_TYPES.has(entry.attachmentMimeType || "");
                const attachmentSrc = entry.fileId
                  ? `${API_URL}/api/files/${entry.fileId}/download`
                  : entry.attachmentUrl || `${API_URL}/api/updates/${entry.id}/attachment`;
                const isAuthor =
                  !!currentUserId && !!entry.author?.id && entry.author.id === currentUserId;
                const canEdit = isAuthor || isPrivileged || !currentRole;
                const isEditing = editingId === entry.id;
                const showEdited =
                  !!entry.updatedAt &&
                  new Date(entry.updatedAt).getTime() - new Date(entry.createdAt).getTime() >
                    2 * 60 * 1000;
                return (
                  <div
                    key={entry.id}
                    data-testid={`update-entry-${entry.id}`}
                    className="rounded-xl border-[0.5px] border-card-border bg-card-surface-area p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar name={entry.author?.name ?? "Unknown"} size={26} />
                        <span className="truncate text-sm font-medium text-text-primary">
                          {entry.author?.name}
                        </span>
                        <span className="shrink-0 text-xs text-text-tertiary">
                          {formatRelativeTime(entry.createdAt)}
                        </span>
                        {showEdited && (
                          <span
                            data-testid="update-edited-indicator"
                            className="shrink-0 text-xs text-text-tertiary italic"
                          >
                            (edited)
                          </span>
                        )}
                      </div>
                      {!isArchived && !isEditing && (
                        <div className="flex shrink-0 items-center gap-1">
                          {canEdit && (
                            <Button
                              appearance="ghost"
                              size="xs"
                              onClick={() => startEdit(entry)}
                              aria-label="Edit update"
                              data-testid={`edit-update-${entry.id}`}
                            >
                              <Pencil />
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            appearance="ghost"
                            size="xs"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          maxLength={5000}
                          rows={4}
                          autoFocus
                          data-testid={`edit-update-textarea-${entry.id}`}
                        />
                        <div className="flex justify-end gap-2">
                          <Button appearance="outline" size="sm" onClick={cancelEdit}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveEdit(entry.id)}
                            disabled={editSaving || !editDraft.trim()}
                            data-testid={`save-update-${entry.id}`}
                          >
                            {editSaving ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-2.5 text-sm leading-6 whitespace-pre-wrap text-text-secondary">
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
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={attachmentSrc}
                        alt=""
                        className="mt-3 max-h-80 max-w-full rounded-lg border-[0.5px] border-card-border"
                      />
                    )}
                    {entry.hasAttachment && !isImage && (
                      <button
                        onClick={() =>
                          entry.fileId
                            ? handleAttachmentDownload(entry.fileId, entry.attachmentName || "download")
                            : window.open(attachmentSrc, "_blank")
                        }
                        className={cn(
                          buttonStyles({ appearance: "outline", size: "sm" }),
                          "mt-3 flex w-full min-w-0 justify-start sm:w-fit",
                        )}
                      >
                        <FileText className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          {entry.attachmentName || "Download"}
                        </span>
                        <Download className="shrink-0 text-icon-tertiary" />
                      </button>
                    )}
                    <CommentsSection
                      targetType="update"
                      targetId={entry.id}
                      commentCount={entry.commentCount ?? 0}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </CardContent>
      </Card>

      <Modal open={showCompose} onClose={closeCompose} size="lg">
        <ModalHeader title="Post Update" />
        <ModalBody className="space-y-4">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write a status update..."
            maxLength={5000}
            rows={4}
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className={buttonStyles({ appearance: "outline", size: "sm" })}>
              <Paperclip />
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
                  className="text-icon-tertiary transition-colors hover:text-button-error-outline-text"
                  aria-label="Remove attachment"
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
          <Button onClick={handlePost} disabled={posting || !newContent.trim()}>
            {posting ? "Posting..." : "Post"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
