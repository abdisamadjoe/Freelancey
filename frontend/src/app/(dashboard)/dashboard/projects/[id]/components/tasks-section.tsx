"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import { Pagination } from "@/components/pagination";
import {
  Trash2,
  ListTodo,
  Vote,
  Lock,
  Download,
  UserCircle,
  MessageSquare,
  Plus,
  ChevronDown,
  CheckSquare,
  Calendar,
} from "lucide-react";
import { track } from "@/lib/track";
import { LabelBadge } from "@/components/label-badge";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  EmptyState,
  Input,
  ListItemSkeleton,
  StatusBadge,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  TaskDetailModal,
  type TaskDetailLabel,
} from "@/components/task-detail-modal";
import { downloadCsv } from "@/lib/download";
import { getTaskStatusLabel } from "@/lib/task-status";

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
  isClientRequest: boolean;
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
  labels?: { label: { id: string; name: string; color: string } }[];
  _count?: { votes: number; comments: number };
}

interface OrgMember {
  userId: string;
  role: string;
  user: { id: string; name: string; email: string; image?: string | null };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const FILTERS = [
  { key: "active", label: "Active" },
  { key: "all", label: "All" },
  { key: "done", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
] as const;

const ROW_CLASS = cn(
  "w-full rounded-lg border-[0.5px] border-card-border bg-card-background p-2.5 text-left transition-colors",
  "cursor-pointer hover:bg-background-gray-secondary_alt/60",
  "focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring focus-visible:outline-none",
);

export function TasksSection({
  projectId,
  isArchived,
}: {
  projectId: string;
  isArchived: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const { success, error: showError } = useToast();
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [members, setMembers] = useState<OrgMember[]>([]);
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
    apiFetch<PaginatedResponse<TaskRecord>>(
      `/tasks/project/${projectId}?page=${page}&limit=20&status=${statusFilter}`,
    )
      .then((res) => {
        setTasks(res.data);
        setTotalPages(res.meta.totalPages);
        setLoadError(null);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err instanceof Error ? err.message : "Failed to load tasks");
      })
      .finally(() => setLoading(false));
  }, [projectId, page, statusFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    apiFetch<PaginatedResponse<OrgMember>>("/clients?limit=100")
      .then((res) => setMembers(res.data.filter((m) => m.role === "owner" || m.role === "admin")))
      .catch(console.error);
    apiFetch<TaskDetailLabel[]>("/labels")
      .then(setLabels)
      .catch(console.error);
  }, []);

  // Deep link: read `?task=<id>` to open modal on mount/URL change
  useEffect(() => {
    const taskParam = searchParams.get("task");
    if (taskParam) setOpenTaskId(taskParam);
  }, [searchParams]);

  const startCreating = (type: "checkbox" | "decision") => {
    setTaskType(type);
    setCreating(true);
  };

  const cancelCreating = () => {
    setCreating(false);
    setNewTitle("");
    setNewDueDate("");
    setNewQuestion("");
    setNewOptions(["", ""]);
  };

  const updateTaskInUrl = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("task", id);
      else params.delete("task");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const openTask = (id: string) => {
    setOpenTaskId(id);
    updateTaskInUrl(id);
  };

  const closeTask = () => {
    setOpenTaskId(null);
    updateTaskInUrl(null);
  };

  const handleAdd = async () => {
    if (taskType === "checkbox") {
      if (!newTitle.trim()) return;
      try {
        await apiFetch(`/tasks?projectId=${projectId}`, {
          method: "POST",
          body: JSON.stringify({
            title: newTitle,
            dueDate: newDueDate || undefined,
          }),
        });
        track("task_created");
        setNewTitle("");
        setNewDueDate("");
        setCreating(false);
        loadTasks();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to add task");
      }
    } else {
      if (!newQuestion.trim() || newOptions.filter((o) => o.trim()).length < 2) return;
      try {
        await apiFetch(`/tasks?projectId=${projectId}`, {
          method: "POST",
          body: JSON.stringify({
            title: newQuestion,
            type: "decision",
            question: newQuestion,
            options: newOptions.filter((o) => o.trim()).map((label) => ({ label })),
          }),
        });
        track("task_created", { type: "decision" });
        setNewQuestion("");
        setNewOptions(["", ""]);
        setCreating(false);
        loadTasks();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to add decision task");
      }
    }
  };

  const handleDelete = async (taskId: string) => {
    const ok = await confirm({
      title: "Delete Task",
      message: "Delete this task? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
      loadTasks();
      success("Task deleted");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  const openTaskRecord = openTaskId ? tasks.find((t) => t.id === openTaskId) : null;
  const showSkeleton = loading && tasks.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks{tasks.length > 0 && ` (${tasks.length})`}</CardTitle>
        {tasks.length > 0 && (
          <CardAction>
            <Button
              appearance="outline"
              size="sm"
              onClick={() => downloadCsv(`/tasks/project/${projectId}/export`)}
              title="Export tasks as CSV"
            >
              <Download />
              Export
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status filter — segmented control */}
          <div className="flex items-center gap-1 rounded-lg bg-tab-background p-1">
            {FILTERS.map((f) => {
              const isActive = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  data-active={isActive}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => {
                    setStatusFilter(f.key);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                    "focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring focus-visible:outline-none",
                    isActive
                      ? "bg-tab-active-background text-text-primary shadow-xs"
                      : "text-text-tertiary hover:text-text-primary",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {!isArchived && !creating && (
            <DropdownMenu
              trigger={
                <Button appearance="outline" size="sm">
                  <Plus />
                  Create
                  <ChevronDown className="text-icon-tertiary" />
                </Button>
              }
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => startCreating("checkbox")}
              >
                <CheckSquare />
                Task
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => startCreating("decision")}
              >
                <Vote />
                Decision
              </Button>
            </DropdownMenu>
          )}
        </div>

        {!isArchived && creating && taskType === "checkbox" && (
          <div className="flex flex-col gap-2">
            <Input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a task..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") cancelCreating();
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full sm:max-w-52"
              />
              <div className="flex items-center gap-2 sm:ml-auto">
                <Button appearance="outline" onClick={cancelCreating}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!newTitle.trim()}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isArchived && creating && taskType === "decision" && (
          <div className="space-y-3 rounded-lg border-[0.5px] border-card-border bg-card-surface-area p-4">
            <Input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ask a question..."
            />
            <div className="space-y-2">
              {newOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={opt}
                    onChange={(e) =>
                      setNewOptions((prev) =>
                        prev.map((o, idx) => (idx === i ? e.target.value : o)),
                      )
                    }
                    placeholder={`Option ${i + 1}`}
                  />
                  {newOptions.length > 2 && (
                    <Button
                      variant="danger"
                      appearance="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => setNewOptions((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={`Remove option ${i + 1}`}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                appearance="ghost"
                size="sm"
                onClick={() => setNewOptions((prev) => [...prev, ""])}
                disabled={newOptions.length >= 5}
              >
                + Add Option
              </Button>
              <div className="flex items-center gap-2">
                <Button appearance="outline" size="sm" onClick={cancelCreating}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={!newQuestion.trim() || newOptions.filter((o) => o.trim()).length < 2}
                >
                  Add Decision
                </Button>
              </div>
            </div>
          </div>
        )}

        {loadError ? (
          <Alert
            status="error"
            title="Could not load tasks"
            actions={
              <Button appearance="outline" size="sm" onClick={() => loadTasks()}>
                Retry
              </Button>
            }
          >
            {loadError}
          </Alert>
        ) : showSkeleton ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <ListItemSkeleton key={index} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={<ListTodo className="size-5" aria-hidden />}
            title={statusFilter === "active" ? "No active tasks." : "No tasks."}
            className="py-8"
          />
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              if (task.type === "decision") {
                const totalVotes = task.options?.reduce((s, o) => s + o._count.votes, 0) || 0;
                const isClosed = !!task.closedAt;

                return (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openTask(task.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openTask(task.id);
                      }
                    }}
                    data-testid={`task-row-${task.id}`}
                    className={ROW_CLASS}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-badge-primary-background text-neutral-brand-color">
                        <Vote size={12} />
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-sm text-text-primary",
                          isClosed && "text-text-tertiary",
                        )}
                      >
                        <span className="break-words">{task.question || task.title}</span>
                        {task.labels && task.labels.length > 0 && (
                          <span className="ml-2 inline-flex gap-1 align-middle">
                            {task.labels.map((l) => (
                              <LabelBadge key={l.label.id} name={l.label.name} color={l.label.color} />
                            ))}
                          </span>
                        )}
                      </span>
                      {isClosed && (
                        <Badge color="gray" className="shrink-0">
                          <Lock size={10} />
                          Closed
                        </Badge>
                      )}
                      {totalVotes > 0 && (
                        <span className="shrink-0 text-xs text-text-tertiary">
                          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                        </span>
                      )}
                      {task._count && task._count.comments > 0 && (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-text-tertiary">
                          <MessageSquare size={12} />
                          {task._count.comments}
                        </span>
                      )}
                      {!isArchived && (
                        <Button
                          variant="danger"
                          appearance="ghost"
                          size="xs"
                          iconOnly
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(task.id);
                          }}
                          aria-label="Delete decision"
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              }

              // Checkbox / request task — clickable row opening the detail modal
              const statusText = getTaskStatusLabel(task.status);
              const strike = task.status === "done" || task.status === "cancelled";

              return (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openTask(task.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openTask(task.id);
                    }
                  }}
                  data-testid={`task-row-${task.id}`}
                  className={ROW_CLASS}
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={task.status} label={statusText} className="shrink-0" />

                    <span
                      className={cn(
                        "min-w-0 flex-1 text-sm text-text-primary",
                        strike && "text-text-tertiary line-through",
                      )}
                    >
                      <span className="break-words">{task.title}</span>
                      {task.isClientRequest && (
                        <Badge color="warning" className="ml-2 align-middle">
                          <UserCircle size={10} />
                          {task.requester?.name ?? "Client"}
                        </Badge>
                      )}
                      {task.labels && task.labels.length > 0 && (
                        <span className="ml-2 inline-flex gap-1 align-middle">
                          {task.labels.map((l) => (
                            <LabelBadge key={l.label.id} name={l.label.name} color={l.label.color} />
                          ))}
                        </span>
                      )}
                    </span>

                    {task._count && task._count.comments > 0 && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-text-tertiary">
                        <MessageSquare size={12} />
                        {task._count.comments}
                      </span>
                    )}

                    {task.dueDate && (() => {
                      const due = new Date(task.dueDate);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dueDay = new Date(due);
                      dueDay.setHours(0, 0, 0, 0);
                      const active = task.status !== "done" && task.status !== "cancelled";
                      const overdue = active && dueDay.getTime() < today.getTime();
                      const dueToday = active && dueDay.getTime() === today.getTime();
                      const tone = overdue ? "error" : dueToday ? "warning" : "gray";
                      return (
                        <Badge color={tone} className="shrink-0">
                          <Calendar size={10} />
                          {due.toLocaleDateString()}
                        </Badge>
                      );
                    })()}

                    <span className="shrink-0" title={task.assignee?.name ?? "Unassigned"}>
                      {task.assignee ? (
                        <Avatar
                          name={task.assignee.name}
                          image={task.assignee.image}
                          size={22}
                        />
                      ) : (
                        <span className="inline-flex size-[22px] items-center justify-center rounded-full border border-dashed border-card-border text-icon-tertiary">
                          <UserCircle size={14} />
                        </span>
                      )}
                    </span>

                    {!isArchived && (
                      <Button
                        variant="danger"
                        appearance="ghost"
                        size="xs"
                        iconOnly
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(task.id);
                        }}
                        aria-label="Delete task"
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </CardContent>

      {openTaskRecord && (
        <TaskDetailModal
          task={openTaskRecord}
          viewer="agency"
          members={members.map((m) => ({ userId: m.userId, user: m.user }))}
          labels={labels}
          onLabelsChange={setLabels}
          onClose={closeTask}
          onChange={loadTasks}
          onDelete={() => {
            closeTask();
            loadTasks();
          }}
        />
      )}
    </Card>
  );
}
