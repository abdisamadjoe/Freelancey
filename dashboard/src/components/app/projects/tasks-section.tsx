"use client";

import { ActionButton, Empty, fmtDate, LabelChip, Loading, Notice, PagerRow, Panel, StatusBadge, TextInput } from "@/components/app/kit";
import { TaskDetailModal, type TaskDetailLabel, type TaskDetailMember, type TaskDetailRecord } from "@/components/app/task-detail-modal";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { downloadCsv } from "@/lib/download";
import { getTaskStatusColor, getTaskStatusLabel } from "@/lib/task-status";
import { useSession } from "@/lib/session";
import { track } from "@/lib/track";
import { cn } from "@/utils/cn";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface TaskRecord extends TaskDetailRecord {
  order: number;
}

interface OrgMember {
  userId: string;
  role: string;
  user: { id: string; name: string; email: string; image?: string | null };
}

const FILTERS = [
  { key: "active", label: "Active" },
  { key: "all", label: "All" },
  { key: "done", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export function TasksSection({ projectId, isArchived }: { projectId: string; isArchived: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [members, setMembers] = useState<TaskDetailMember[]>([]);
  const [labels, setLabels] = useState<TaskDetailLabel[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [taskType, setTaskType] = useState<"checkbox" | "decision">("checkbox");
  const [creating, setCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState<string[]>(["", ""]);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTasks = useCallback(() => {
    setLoading(true);
    apiFetch<{ data: TaskRecord[]; meta: { totalPages: number } }>(
      `/tasks/project/${projectId}?page=${page}&limit=20&status=${statusFilter}`,
    )
      .then((res) => {
        setTasks(res.data);
        setTotalPages(res.meta.totalPages);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load tasks"))
      .finally(() => setLoading(false));
  }, [projectId, page, statusFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    apiFetch<{ data: OrgMember[] }>("/clients?limit=100")
      .then((res) => setMembers(res.data.filter((m) => m.role === "owner" || m.role === "admin")))
      .catch(() => {});
    apiFetch<TaskDetailLabel[]>("/labels").then(setLabels).catch(() => {});
  }, []);

  // Deep link: `?task=<id>` opens the detail modal.
  useEffect(() => {
    const taskParam = searchParams.get("task");
    if (taskParam) setOpenTaskId(taskParam);
  }, [searchParams]);

  const setTaskInUrl = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("task", id);
    else params.delete("task");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  const cancelCreating = () => {
    setCreating(false);
    setNewTitle("");
    setNewDueDate("");
    setNewQuestion("");
    setNewOptions(["", ""]);
  };

  const handleAdd = async () => {
    try {
      if (taskType === "checkbox") {
        if (!newTitle.trim()) return;
        await apiFetch(`/tasks?projectId=${projectId}`, {
          method: "POST",
          body: JSON.stringify({ title: newTitle, dueDate: newDueDate || undefined }),
        });
        track("task_created");
      } else {
        const options = newOptions.filter((o) => o.trim());
        if (!newQuestion.trim() || options.length < 2) return;
        await apiFetch(`/tasks?projectId=${projectId}`, {
          method: "POST",
          body: JSON.stringify({
            title: newQuestion,
            type: "decision",
            question: newQuestion,
            options: options.map((label) => ({ label })),
          }),
        });
        track("task_created", { type: "decision" });
      }
      cancelCreating();
      loadTasks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add task");
    }
  };

  const openTaskRecord = openTaskId ? tasks.find((t) => t.id === openTaskId) : null;

  return (
    <>
      <Panel
        title={`Tasks${tasks.length > 0 ? ` (${tasks.length})` : ""}`}
        action={
          tasks.length > 0 && (
            <Button size="sm" appearance="outline" variant="primary" onPress={() => downloadCsv(`/tasks/project/${projectId}/export`)}>
              Export
            </Button>
          )
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-tab-background p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-current={statusFilter === f.key ? "true" : undefined}
                  onClick={() => {
                    setStatusFilter(f.key);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                    statusFilter === f.key ? "bg-tab-active-background text-text-primary shadow-xs" : "text-text-tertiary hover:text-text-primary",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {!isArchived && !creating && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  appearance="outline"
                  variant="primary"
                  onPress={() => {
                    setTaskType("checkbox");
                    setCreating(true);
                  }}
                >
                  New task
                </Button>
                <Button
                  size="sm"
                  appearance="outline"
                  variant="primary"
                  onPress={() => {
                    setTaskType("decision");
                    setCreating(true);
                  }}
                >
                  New decision
                </Button>
              </div>
            )}
          </div>

          {creating && (
            <div className="space-y-3 rounded-lg border border-card-border p-4">
              {taskType === "checkbox" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput label="Task" value={newTitle} onChange={setNewTitle} placeholder="What needs doing?" />
                  <TextInput label="Due date" type="date" value={newDueDate} onChange={setNewDueDate} />
                </div>
              ) : (
                <div className="space-y-3">
                  <TextInput label="Question" value={newQuestion} onChange={setNewQuestion} placeholder="What should the client decide?" />
                  {newOptions.map((o, i) => (
                    <TextInput
                      key={i}
                      label={`Option ${i + 1}`}
                      value={o}
                      onChange={(v) => setNewOptions((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
                    />
                  ))}
                  {newOptions.length < 6 && (
                    <Button size="xs" appearance="outline" variant="primary" onPress={() => setNewOptions((p) => [...p, ""])}>
                      Add option
                    </Button>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <ActionButton size="sm" variant="primary" onPress={handleAdd}>
                  Add
                </ActionButton>
                <Button size="sm" appearance="outline" variant="primary" onPress={cancelCreating}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {loadError && <Notice status="error">{loadError}</Notice>}

          {loading && tasks.length === 0 ? (
            <Loading />
          ) : tasks.length === 0 ? (
            <Empty>No tasks here yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenTaskId(t.id);
                      setTaskInUrl(t.id);
                    }}
                    className="w-full rounded-lg border-[0.5px] border-card-border bg-card-background p-2.5 text-left transition-colors hover:bg-background-gray-secondary_alt/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {t.type === "decision" ? "Decision: " : ""}
                          {t.title}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {t.dueDate ? `Due ${fmtDate(t.dueDate)}` : "No due date"}
                          {t.assignee ? ` · ${t.assignee.name}` : ""}
                          {t.isClientRequest && t.requester ? ` · Requested by ${t.requester.name}` : ""}
                          {(t._count?.comments ?? 0) > 0 ? ` · ${t._count?.comments} comments` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(t.labels ?? []).map((l) => (
                          <LabelChip key={l.label.id} name={l.label.name} color={l.label.color} />
                        ))}
                        <StatusBadge color={getTaskStatusColor(t.status)}>{getTaskStatusLabel(t.status)}</StatusBadge>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <PagerRow page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </Panel>

      {openTaskRecord && (
        <TaskDetailModal
          task={openTaskRecord}
          viewer="agency"
          members={members}
          labels={labels}
          isArchived={isArchived}
          currentUserId={session.user.id}
          onClose={() => {
            setOpenTaskId(null);
            setTaskInUrl(null);
          }}
          onChanged={loadTasks}
          onDeleted={loadTasks}
        />
      )}
    </>
  );
}
