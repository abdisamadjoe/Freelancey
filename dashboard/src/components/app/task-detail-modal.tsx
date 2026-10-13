"use client";

import { ActionButton, fmtDate, FormGrid, Modal, MultiSelectInput, Notice, SelectInput, StatusBadge, TextAreaInput, TextInput } from "@/components/app/kit";
import { CommentsSection } from "@/components/app/comments-section";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { getTaskStatusColor, getTaskStatusLabel, TASK_STATUS_OPTIONS } from "@/lib/task-status";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface TaskDetailRecord {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status: string;
  type: string;
  requestedById?: string | null;
  assigneeId?: string | null;
  requester?: { id: string; name: string; image?: string | null } | null;
  assignee?: { id: string; name: string; image?: string | null } | null;
  isClientRequest?: boolean;
  labels?: { label: { id: string; name: string; color: string } }[];
  createdAt?: string;
  question?: string;
  closedAt?: string | null;
  options?: { id: string; label: string; order: number; _count: { votes: number } }[];
  votes?: { optionId: string }[];
  _count?: { comments: number; votes?: number };
}

export interface TaskDetailMember {
  userId: string;
  user: { id: string; name: string; image?: string | null };
}

export interface TaskDetailLabel {
  id: string;
  name: string;
  color: string;
}

export type TaskDetailViewer = "agency" | "client";

/** One task: edit it (agency), vote on it (client), comment on it. */
export function TaskDetailModal({
  task,
  viewer,
  members,
  labels,
  isArchived,
  currentUserId,
  onClose,
  onChanged,
  onDeleted,
}: {
  task: TaskDetailRecord;
  viewer: TaskDetailViewer;
  members: TaskDetailMember[];
  labels: TaskDetailLabel[];
  isArchived?: boolean;
  currentUserId?: string | null;
  onClose: () => void;
  onChanged: () => void;
  onDeleted?: () => void;
}) {
  const isAgency = viewer === "agency";
  const canEdit = isAgency && !isArchived;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split("T")[0] : "");
  const [status, setStatus] = useState(task.status);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [assigned, setAssigned] = useState<string[]>((task.labels ?? []).map((l) => l.label.id));
  const [saving, setSaving] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(task.votes?.[0]?.optionId ?? null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
    setStatus(task.status);
    setAssigneeId(task.assigneeId ?? "");
    setAssigned((task.labels ?? []).map((l) => l.label.id));
  }, [task]);

  const isDecision = task.type === "decision";
  const decisionClosed = !!task.closedAt;

  async function save(body: Record<string, unknown>) {
    setSaving(true);
    try {
      await apiFetch(`/tasks/${task.id}`, { method: "PUT", body: JSON.stringify(body) });
      onChanged();
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function changeLabels(next: string[]) {
    const current = new Set(assigned);
    const target = new Set(next);
    setAssigned(next);
    try {
      for (const id of target) {
        if (!current.has(id)) {
          await apiFetch(`/labels/${id}/assign`, { method: "POST", body: JSON.stringify({ entityType: "task", entityId: task.id }) });
        }
      }
      for (const id of current) {
        if (!target.has(id)) {
          await apiFetch(`/labels/${id}/assign`, { method: "DELETE", body: JSON.stringify({ entityType: "task", entityId: task.id }) });
        }
      }
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update labels");
      setAssigned(Array.from(current));
    }
  }

  async function remove() {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    try {
      await apiFetch(`/tasks/${task.id}`, { method: "DELETE" });
      onDeleted?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  async function cancelRequest() {
    if (!window.confirm("Cancel this request?")) return;
    try {
      await apiFetch(`/tasks/${task.id}/cancel`, { method: "PATCH" });
      onChanged();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    }
  }

  async function vote() {
    if (!selectedOptionId || decisionClosed) return;
    setVoting(true);
    try {
      await apiFetch(`/tasks/${task.id}/vote`, { method: "POST", body: JSON.stringify({ optionId: selectedOptionId }) });
      toast.success("Vote recorded");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to vote");
    } finally {
      setVoting(false);
    }
  }

  async function closeVoting() {
    if (decisionClosed || !window.confirm("Close voting on this decision? No further votes can be cast.")) return;
    try {
      await apiFetch(`/tasks/${task.id}/close`, { method: "POST" });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close voting");
    }
  }

  const totalVotes = (task.options ?? []).reduce((n, o) => n + o._count.votes, 0);
  const canCancelOwn = !isAgency && task.isClientRequest && task.requestedById === currentUserId && task.status === "open";

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {isDecision ? "Decision" : "Task"}
          <StatusBadge color={getTaskStatusColor(task.status)}>{getTaskStatusLabel(task.status)}</StatusBadge>
        </span>
      }
      description={task.requester ? `Requested by ${task.requester.name}` : undefined}
    >
      <div className="space-y-5">
        {canEdit ? (
          <div className="space-y-4">
            <TextInput label="Title" value={title} onChange={setTitle} />
            <TextAreaInput label="Description" rows={4} value={description} onChange={setDescription} />
            <ActionButton
              size="sm"
              variant="primary"
              loading={saving}
              isDisabled={title === task.title && description === (task.description ?? "") || !title.trim()}
              onPress={() => save({ title, description })}
            >
              Save changes
            </ActionButton>
            <FormGrid>
              <TextInput
                label="Due date"
                type="date"
                value={dueDate}
                onChange={(v) => {
                  setDueDate(v);
                  save({ dueDate: v || null });
                }}
              />
              {!isDecision && (
                <SelectInput
                  label="Status"
                  value={status}
                  options={TASK_STATUS_OPTIONS}
                  onChange={(v) => {
                    setStatus(v);
                    save({ status: v });
                  }}
                />
              )}
              <SelectInput
                label="Assignee"
                value={assigneeId}
                options={[{ value: "", label: "Unassigned" }, ...members.map((m) => ({ value: m.userId, label: m.user.name }))]}
                onChange={(v) => {
                  setAssigneeId(v);
                  save({ assigneeId: v || null });
                }}
              />
            </FormGrid>
            {labels.length > 0 && (
              <MultiSelectInput
                label="Labels"
                value={assigned}
                onChange={changeLabels}
                options={labels.map((l) => ({ value: l.id, label: l.name }))}
              />
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-text-primary">{isDecision ? task.question || task.title : task.title}</h3>
            {task.description && <p className="text-sm whitespace-pre-wrap text-text-secondary">{task.description}</p>}
            <p className="text-xs text-text-tertiary">
              {task.dueDate ? `Due ${fmtDate(task.dueDate)}` : "No due date"}
              {task.assignee ? ` · Assigned to ${task.assignee.name}` : ""}
            </p>
          </div>
        )}

        {isDecision && (
          <div className="space-y-3 border-t border-card-border pt-4">
            <p className="text-sm font-medium text-text-primary">{task.question || task.title}</p>
            {decisionClosed && <Notice status="info">Voting is closed.</Notice>}
            <ul className="space-y-2">
              {(task.options ?? []).map((o) => {
                const pct = totalVotes > 0 ? Math.round((o._count.votes / totalVotes) * 100) : 0;
                const isSelected = selectedOptionId === o.id;
                const canVote = !isAgency && !decisionClosed;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      disabled={!canVote}
                      onClick={() => setSelectedOptionId(o.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm ${
                        isSelected ? "border-input-primary-focus-border bg-badge-primary-background" : "border-card-border"
                      } ${canVote ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <span className="text-text-primary">{o.label}</span>
                      <span className="text-xs text-text-tertiary">
                        {o._count.votes} vote{o._count.votes === 1 ? "" : "s"} · {pct}%
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {!isAgency && !decisionClosed && (
              <ActionButton size="sm" variant="primary" loading={voting} isDisabled={!selectedOptionId} onPress={vote}>
                Submit vote
              </ActionButton>
            )}
            {isAgency && !decisionClosed && canEdit && (
              <Button size="sm" appearance="outline" variant="primary" onPress={closeVoting}>
                Close voting
              </Button>
            )}
          </div>
        )}

        {!isAgency && !isDecision && (
          <p className="text-xs text-text-tertiary">Status: {getTaskStatusLabel(task.status)}</p>
        )}

        <div className="border-t border-card-border pt-4">
          <CommentsSection targetType="task" targetId={task.id} commentCount={task._count?.comments ?? 0} alwaysExpanded />
        </div>

        {(canEdit || canCancelOwn) && (
          <div className="flex flex-wrap gap-2 border-t border-card-border pt-4">
            {canCancelOwn && (
              <Button size="sm" appearance="outline" variant="danger" onPress={cancelRequest}>
                Cancel request
              </Button>
            )}
            {canEdit && (
              <Button size="sm" variant="danger" appearance="ghost" onPress={remove}>
                Delete task
              </Button>
            )}
            {canEdit && (
              <Button
                size="sm"
                appearance="outline"
                variant="primary"
                onPress={() => {
                  const url = `${window.location.origin}${window.location.pathname}?tab=tasks&task=${task.id}`;
                  navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
                }}
              >
                Copy link
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
