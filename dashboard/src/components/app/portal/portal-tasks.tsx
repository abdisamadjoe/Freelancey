"use client";

import { ActionButton, Empty, fmtDate, Loading, PagerRow, Panel, StatusBadge, TextAreaInput, TextInput } from "@/components/app/kit";
import { TaskDetailModal, type TaskDetailRecord } from "@/components/app/task-detail-modal";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { usePreviewMode } from "@/lib/preview-mode";
import { useSession } from "@/lib/session";
import { getTaskStatusColor, getTaskStatusLabel } from "@/lib/task-status";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function PortalTasksSection({ projectId, isArchived }: { projectId: string; isArchived?: boolean }) {
  const session = useSession();
  const { preview } = usePreviewMode();
  const [tasks, setTasks] = useState<TaskDetailRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => {
    apiFetch<{ data: TaskDetailRecord[]; meta: { totalPages: number } }>(`/tasks/mine/${projectId}?page=${page}&limit=20`)
      .then((res) => {
        setTasks(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("task");
    if (t) setOpen(t);
  }, []);

  async function request() {
    if (!title.trim()) return;
    setPosting(true);
    try {
      await apiFetch(`/tasks/mine?projectId=${projectId}`, {
        method: "POST",
        body: JSON.stringify({ title, description: desc || undefined }),
      });
      setTitle("");
      setDesc("");
      setShowNew(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send request");
    } finally {
      setPosting(false);
    }
  }

  const current = open ? tasks.find((t) => t.id === open) : null;

  return (
    <>
      <Panel
        title="Tasks & requests"
        action={
          !isArchived && !preview && (
            <Button size="sm" variant="primary" onPress={() => setShowNew((v) => !v)}>
              New request
            </Button>
          )
        }
      >
        <div className="space-y-4">
          {showNew && (
            <div className="space-y-3 rounded-lg border border-card-border p-4">
              <TextInput label="What do you need?" value={title} onChange={setTitle} />
              <TextAreaInput label="Details (optional)" rows={3} value={desc} onChange={setDesc} />
              <div className="flex gap-2">
                <ActionButton size="sm" variant="primary" loading={posting} isDisabled={!title.trim()} onPress={request}>
                  Send request
                </ActionButton>
                <Button size="sm" appearance="outline" variant="primary" onPress={() => setShowNew(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <Loading />
          ) : tasks.length === 0 ? (
            <Empty>No tasks yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => {
                const isDecision = t.type === "decision";
                const closed = !!t.closedAt;
                const voted = !!t.votes?.[0];
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(t.id)}
                      className="w-full rounded-lg border-[0.5px] border-card-border bg-card-background p-3 text-left transition-colors hover:bg-background-gray-secondary_alt/60"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-text-primary">{isDecision ? t.question || t.title : t.title}</p>
                          <p className="text-xs text-text-tertiary">
                            {t.dueDate ? `Due ${fmtDate(t.dueDate)}` : "No due date"}
                            {(t._count?.comments ?? 0) > 0 ? ` · ${t._count?.comments} comments` : ""}
                            {isDecision && (t._count?.votes ?? 0) > 0 ? ` · ${t._count?.votes} votes` : ""}
                          </p>
                        </div>
                        {isDecision ? (
                          closed ? (
                            <StatusBadge color="gray">Closed</StatusBadge>
                          ) : !voted ? (
                            <StatusBadge color="warning">Needs vote</StatusBadge>
                          ) : (
                            <StatusBadge color="success">Voted</StatusBadge>
                          )
                        ) : (
                          <StatusBadge color={getTaskStatusColor(t.status)}>{getTaskStatusLabel(t.status)}</StatusBadge>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <PagerRow page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </Panel>

      {current && (
        <TaskDetailModal
          task={current}
          viewer="client"
          members={[]}
          labels={[]}
          isArchived={isArchived || !!preview}
          currentUserId={session.user.id}
          onClose={() => setOpen(null)}
          onChanged={load}
        />
      )}
    </>
  );
}
