"use client";

import { CommentsSection } from "@/components/app/comments-section";
import { Embeds } from "@/components/app/embeds";
import { ActionButton, Empty, fmtDateTime, Loading, Notice, PagerRow, Panel, StatusBadge, TextAreaInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import type { PreviewPrefs } from "@/lib/embeds";
import { linkify } from "@/lib/linkify";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface TimelineEntry {
  id: string;
  kind: "update" | "activity";
  createdAt: string;
  updatedAt?: string;
  content?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  hasAttachment?: boolean;
  fileId?: string;
  previewPrefs?: PreviewPrefs | null;
  author?: { id: string; name: string };
  commentCount?: number;
  type?: string;
  action?: string;
  actor?: { id: string; name: string };
  targetId?: string;
  targetTitle?: string;
  detail?: string;
}

const ACTION_LABEL: Record<string, string> = {
  accepted: "accepted",
  declined: "declined",
  acknowledged: "acknowledged",
  signed: "signed",
  voted: "voted on",
  closed: "closed voting on",
};

const ACTION_COLOR = {
  accepted: "success",
  declined: "error",
  acknowledged: "blue",
  signed: "cyan",
  voted: "warning",
  closed: "gray",
} as const;

export function UpdatesSection({
  projectId,
  isArchived,
  onFileChange,
  currentUserId = null,
  currentRole = null,
  timelinePath,
}: {
  /** Overrides the timeline endpoint (the portal reads `/updates/timeline/mine/:id`). */
  timelinePath?: string;
  projectId: string;
  isArchived: boolean;
  onFileChange?: () => void;
  currentUserId?: string | null;
  currentRole?: string | null;
}) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newContent, setNewContent] = useState("");
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isPrivileged = currentRole === "owner" || currentRole === "admin";

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<{ data: TimelineEntry[]; meta: { totalPages: number } }>(`${timelinePath ?? `/updates/timeline/${projectId}`}?page=${page}&limit=10`)
      .then((res) => {
        setTimeline(res.data);
        setTotalPages(res.meta.totalPages);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load updates"))
      .finally(() => setLoading(false));
  }, [projectId, page, timelinePath]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async () => {
    if (!newContent.trim()) return;
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("content", newContent);
      if (newAttachment) formData.append("attachment", newAttachment);
      await apiFetch(`/updates?projectId=${projectId}`, { method: "POST", body: formData });
      setNewContent("");
      setNewAttachment(null);
      toast.success("Update posted");
      load();
      if (newAttachment) onFileChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post update");
    } finally {
      setPosting(false);
    }
  };

  const saveEdit = async (updateId: string) => {
    const content = editDraft.trim();
    if (!content) return;
    try {
      await apiFetch(`/updates/${updateId}`, { method: "PATCH", body: JSON.stringify({ content }) });
      setEditingId(null);
      setEditDraft("");
      load();
      toast.success("Update edited");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to edit update");
    }
  };

  const remove = async (updateId: string) => {
    if (!window.confirm("Delete this update? This cannot be undone.")) return;
    try {
      await apiFetch(`/updates/${updateId}`, { method: "DELETE" });
      load();
      onFileChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete update");
    }
  };

  const changePrefs = async (updateId: string, next: PreviewPrefs) => {
    // Optimistic: preview prefs are a display hint, so server errors are silent.
    setTimeline((prev) => prev.map((e) => (e.id === updateId ? { ...e, previewPrefs: next } : e)));
    try {
      await apiFetch(`/updates/${updateId}/preview-prefs`, { method: "PATCH", body: JSON.stringify({ previewPrefs: next }) });
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {!isArchived && (
        <Panel title="Post an update" description="Everyone on the project, including clients, sees updates.">
          <div className="space-y-3">
            <TextAreaInput rows={3} value={newContent} onChange={setNewContent} placeholder="What's new on this project?" />
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                aria-label="Attachment"
                onChange={(e) => setNewAttachment(e.target.files?.[0] ?? null)}
                className="text-sm text-text-secondary"
              />
              <ActionButton variant="primary" loading={posting} isDisabled={!newContent.trim()} onPress={post}>
                Post update
              </ActionButton>
            </div>
          </div>
        </Panel>
      )}

      {loadError && <Notice status="error">{loadError}</Notice>}

      {loading && timeline.length === 0 ? (
        <Loading />
      ) : timeline.length === 0 ? (
        <Empty>No updates yet.</Empty>
      ) : (
        <ul className="space-y-4">
          {timeline.map((entry) =>
            entry.kind === "activity" ? (
              <li key={entry.id} className="flex flex-wrap items-center gap-2 px-1 text-sm text-text-secondary">
                <span className="font-medium text-text-primary">{entry.actor?.name ?? "Someone"}</span>
                {entry.action && (
                  <StatusBadge color={ACTION_COLOR[entry.action as keyof typeof ACTION_COLOR] ?? "gray"}>
                    {ACTION_LABEL[entry.action] ?? entry.action}
                  </StatusBadge>
                )}
                <span>{entry.targetTitle}</span>
                <span className="text-xs text-text-tertiary">{fmtDateTime(entry.createdAt)}</span>
              </li>
            ) : (
              <li key={entry.id}>
                <Panel>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{entry.author?.name}</p>
                        <p className="text-xs text-text-tertiary">
                          {fmtDateTime(entry.createdAt)}
                          {entry.updatedAt && entry.updatedAt !== entry.createdAt ? " · edited" : ""}
                        </p>
                      </div>
                      {!isArchived && (entry.author?.id === currentUserId || isPrivileged) && (
                        <div className="flex gap-1">
                          {entry.author?.id === currentUserId && (
                            <Button
                              size="xs"
                              variant="ghost"
                              onPress={() => {
                                setEditingId(entry.id);
                                setEditDraft(entry.content || "");
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          <Button size="xs" variant="danger" appearance="ghost" onPress={() => remove(entry.id)}>
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>

                    {editingId === entry.id ? (
                      <div className="space-y-2">
                        <TextAreaInput rows={3} value={editDraft} onChange={setEditDraft} />
                        <div className="flex gap-2">
                          <ActionButton size="sm" variant="primary" isDisabled={!editDraft.trim()} onPress={() => saveEdit(entry.id)}>
                            Save
                          </ActionButton>
                          <Button size="sm" appearance="outline" variant="primary" onPress={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap text-text-primary">{linkify(entry.content ?? "")}</p>
                    )}

                    {entry.content && editingId !== entry.id && (
                      <Embeds text={entry.content} prefs={entry.previewPrefs ?? {}} onPrefsChange={(next) => changePrefs(entry.id, next)} />
                    )}

                    {(entry.hasAttachment || entry.attachmentName) && (
                      <div className="space-y-2">
                        {entry.attachmentMimeType && IMAGE_TYPES.has(entry.attachmentMimeType) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.fileId ? `${API_URL}/api/files/${entry.fileId}/download` : entry.attachmentUrl || `${API_URL}/api/updates/${entry.id}/attachment`}
                            alt={entry.attachmentName || "Attachment"}
                            className="max-h-72 rounded-lg border border-card-border"
                          />
                        )}
                        <Button
                          size="sm"
                          appearance="outline"
                          variant="primary"
                          onPress={() =>
                            entry.fileId
                              ? downloadFile(entry.fileId, entry.attachmentName || "download").catch((e) => toast.error(e.message))
                              : window.open(entry.attachmentUrl || `${API_URL}/api/updates/${entry.id}/attachment`, "_blank")
                          }
                        >
                          Download {entry.attachmentName || "attachment"}
                        </Button>
                      </div>
                    )}

                    <CommentsSection targetType="update" targetId={entry.id} commentCount={entry.commentCount ?? 0} />
                  </div>
                </Panel>
              </li>
            ),
          )}
        </ul>
      )}

      <PagerRow page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  );
}
