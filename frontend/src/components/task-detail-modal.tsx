"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { X, Link2, Trash2, Check, Plus, Vote, Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";
import { CommentsSection } from "@/components/comments-section";
import { LabelBadge } from "@/components/label-badge";
import { ColorPatchGrid, PRESET_COLORS } from "@/components/color-patch-grid";
import { TASK_STATUS_OPTIONS } from "@/lib/task-status";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  EmptyState,
  Field,
  FieldError,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NativeSelect,
  StatusBadge,
  Textarea,
} from "@/components/ui";

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

const STATUS_OPTIONS = TASK_STATUS_OPTIONS;

/** Hairline-separated block inside the modal body. */
function Section({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "border-t border-border-primary pt-5 first:border-t-0 first:pt-0",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  children,
  icon,
  action,
}: {
  children: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-[-0.2px] text-text-primary">
        {icon}
        {children}
      </h3>
      {action}
    </div>
  );
}

/** Small uppercase field caption used by the sidebar blocks. */
function SidebarCaption({ children }: { children: ReactNode }) {
  return <span className="text-sm font-medium text-input-label-text-color">{children}</span>;
}

export function TaskDetailModal({
  task,
  viewer,
  currentUserId,
  members,
  labels,
  onLabelsChange,
  onClose,
  onChange,
  onDelete,
}: {
  task: TaskDetailRecord;
  viewer: TaskDetailViewer;
  currentUserId?: string | null;
  members?: TaskDetailMember[];
  labels?: TaskDetailLabel[];
  onLabelsChange?: (labels: TaskDetailLabel[]) => void;
  onClose: () => void;
  /** Called after a successful mutation so the caller can refresh its list. */
  onChange: () => void;
  /** Called after a successful delete. Caller should close + refresh. */
  onDelete?: () => void;
}) {
  const { success, error: showError } = useToast();
  const confirm = useConfirm();
  const isAgency = viewer === "agency";
  const isOwnRequest =
    !!currentUserId && task.requestedById === currentUserId;
  const canCancel = !isAgency && isOwnRequest && task.status === "open";

  const [title, setTitle] = useState(task.title);
  const [titleEditing, setTitleEditing] = useState(false);
  const [description, setDescription] = useState(task.description ?? "");
  const [descEditing, setDescEditing] = useState(false);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split("T")[0] : "");
  const [dueEditing, setDueEditing] = useState(false);
  const [status, setStatus] = useState(task.status);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [assignedLabels, setAssignedLabels] = useState<string[]>(
    task.labels?.map((l) => l.label.id) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [labelMenuOpen, setLabelMenuOpen] = useState(false);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState<string>(PRESET_COLORS[0].hex);
  const [savingLabel, setSavingLabel] = useState(false);
  const [labelError, setLabelError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      try {
        await apiFetch(`/tasks/${task.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        onChange();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Update failed");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [task.id, onChange, showError],
  );

  const handleSaveTitle = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) {
      setTitle(task.title);
      setTitleEditing(false);
      return;
    }
    try {
      await patch({ title: trimmed });
      setTitleEditing(false);
    } catch {
      setTitle(task.title);
    }
  };

  const handleSaveDescription = async () => {
    if (description === (task.description ?? "")) {
      setDescEditing(false);
      return;
    }
    try {
      await patch({ description: description || null });
      setDescEditing(false);
    } catch {
      setDescription(task.description ?? "");
    }
  };

  const handleSaveDueDate = async () => {
    const normalized = task.dueDate ? task.dueDate.split("T")[0] : "";
    if (dueDate === normalized) {
      setDueEditing(false);
      return;
    }
    try {
      await patch({ dueDate: dueDate || null });
      setDueEditing(false);
    } catch {
      setDueDate(normalized);
    }
  };

  const handleStatusChange = async (next: string) => {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    try {
      await patch({ status: next });
    } catch {
      setStatus(prev);
    }
  };

  const handleAssigneeChange = async (next: string) => {
    if (next === assigneeId) return;
    const prev = assigneeId;
    setAssigneeId(next);
    try {
      await patch({ assigneeId: next || null });
    } catch {
      setAssigneeId(prev);
    }
  };

  const handleToggleLabel = async (labelId: string) => {
    const isAssigned = assignedLabels.includes(labelId);
    const nextIds = isAssigned
      ? assignedLabels.filter((id) => id !== labelId)
      : [...assignedLabels, labelId];
    const previous = assignedLabels;
    setAssignedLabels(nextIds);
    try {
      await apiFetch(`/labels/${labelId}/assign`, {
        method: isAssigned ? "DELETE" : "POST",
        body: JSON.stringify({ entityType: "task", entityId: task.id }),
      });
      onChange();
    } catch (err) {
      setAssignedLabels(previous);
      showError(err instanceof Error ? err.message : "Failed to update labels");
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim() || savingLabel) return;
    setSavingLabel(true);
    setLabelError("");
    try {
      const created = await apiFetch<TaskDetailLabel>("/labels", {
        method: "POST",
        body: JSON.stringify({ name: newLabelName.trim(), color: newLabelColor }),
      });
      if (onLabelsChange) {
        const updated = await apiFetch<TaskDetailLabel[]>("/labels");
        onLabelsChange(updated);
      }
      await handleToggleLabel(created.id);
      setNewLabelName("");
      setNewLabelColor(PRESET_COLORS[0].hex);
      setCreatingLabel(false);
    } catch (err) {
      setLabelError(err instanceof Error ? err.message : "Failed to create label");
    } finally {
      setSavingLabel(false);
    }
  };

  const handleCopyLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("task", task.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      success("Link copied");
    } catch {
      showError("Could not copy link");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete Task",
      message: "Delete this task? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/tasks/${task.id}`, { method: "DELETE" });
      success("Task deleted");
      onDelete?.();
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete task");
    }
  };

  const handleCancelClient = async () => {
    const ok = await confirm({
      title: "Cancel Request",
      message: "Cancel this request? You won't be able to undo this.",
      confirmLabel: "Cancel Request",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/tasks/${task.id}/cancel`, { method: "PATCH" });
      success("Request cancelled");
      onChange();
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  const isDecision = task.type === "decision";
  const decisionClosed = !!task.closedAt;
  const currentVoteOptionId = task.votes?.[0]?.optionId ?? null;
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(currentVoteOptionId);
  const [voting, setVoting] = useState(false);

  const handleVote = async () => {
    if (!selectedOptionId || decisionClosed || voting) return;
    setVoting(true);
    try {
      await apiFetch(`/tasks/${task.id}/vote`, {
        method: "POST",
        body: JSON.stringify({ optionId: selectedOptionId }),
      });
      success("Vote recorded");
      onChange();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to vote");
    } finally {
      setVoting(false);
    }
  };

  const handleCloseVoting = async () => {
    if (decisionClosed) return;
    const ok = await confirm({
      title: "Close Voting",
      message: "Close voting on this decision? No further votes can be cast.",
      confirmLabel: "Close Voting",
    });
    if (!ok) return;
    try {
      await apiFetch(`/tasks/${task.id}/close`, { method: "POST" });
      success("Voting closed");
      onChange();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to close voting");
    }
  };

  const statusOption = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
  const assignedLabelObjects = labels?.filter((l) => assignedLabels.includes(l.id)) ?? [];
  const readOnlyLabels = !isAgency;

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      scrollable={false}
      hideCloseButton
      className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden"
    >
      <div data-testid="task-detail-modal" className="flex min-h-0 flex-1 flex-col">
        <ModalHeader
          className="items-center"
          title={
            isAgency && titleEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setTitle(task.title);
                      setTitleEditing(false);
                    }
                  }}
                  autoFocus
                  maxLength={255}
                  aria-label="Task title"
                  className="font-semibold"
                />
                <Button size="sm" onClick={handleSaveTitle} disabled={saving}>
                  Save
                </Button>
              </div>
            ) : (
              <span
                data-testid="task-title"
                onClick={() => isAgency && setTitleEditing(true)}
                className={cn(
                  "inline-block max-w-full break-words",
                  isAgency &&
                    "-mx-1 cursor-text rounded-md px-1 transition-colors hover:bg-background-gray-secondary_alt",
                )}
              >
                {task.title}
              </span>
            )
          }
        >
          <div className="flex items-center gap-1">
            {isAgency ? (
              <StatusBadge status={status} label={statusOption.label} className="mr-1" />
            ) : null}
            <Button
              variant="ghost"
              appearance="ghost"
              size="sm"
              iconOnly
              onClick={handleCopyLink}
              title="Copy link"
              aria-label="Copy link"
            >
              <Link2 />
            </Button>
            {isAgency && (
              <Button
                variant="danger"
                appearance="ghost"
                size="sm"
                iconOnly
                onClick={handleDelete}
                title="Delete"
                aria-label="Delete task"
              >
                <Trash2 />
              </Button>
            )}
            <Button
              variant="ghost"
              appearance="ghost"
              size="sm"
              iconOnly
              onClick={onClose}
              title="Close"
              aria-label="Close"
            >
              <X />
            </Button>
          </div>
        </ModalHeader>

        <ModalBody className="min-h-0 flex-1 overflow-y-auto p-0">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px]">
            {/* Main column */}
            <div className="min-w-0 space-y-5 p-6">
              {/* Description */}
              <Section>
                <SectionHeading>Description</SectionHeading>
                {isAgency && descEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setDescription(task.description ?? "");
                          setDescEditing(false);
                        }
                      }}
                      autoFocus
                      rows={4}
                      maxLength={5000}
                      placeholder="Add a description..."
                      aria-label="Task description"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleSaveDescription} disabled={saving}>
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        appearance="outline"
                        size="sm"
                        onClick={() => {
                          setDescription(task.description ?? "");
                          setDescEditing(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : description ? (
                  <p
                    onClick={() => isAgency && setDescEditing(true)}
                    className={cn(
                      "text-sm leading-6 break-words whitespace-pre-wrap text-text-secondary",
                      isAgency &&
                        "-mx-1 cursor-text rounded-md px-1 transition-colors hover:bg-background-gray-secondary_alt",
                    )}
                    data-testid="task-description"
                  >
                    {description}
                  </p>
                ) : isAgency ? (
                  <Button
                    variant="ghost"
                    appearance="ghost"
                    size="sm"
                    onClick={() => setDescEditing(true)}
                    className="justify-start text-text-tertiary italic"
                  >
                    Add a description...
                  </Button>
                ) : (
                  <EmptyState
                    variant="plain"
                    title="No description."
                    className="items-start px-0 py-0 text-left"
                  />
                )}
              </Section>

              {/* Decision voting */}
              {isDecision && task.options && task.options.length > 0 && (() => {
                const totalVotes = task.options.reduce((s, o) => s + o._count.votes, 0);
                const hasResults = totalVotes > 0;
                return (
                  <Section>
                    <SectionHeading
                      icon={<Vote className="size-3.5" aria-hidden />}
                      action={
                        decisionClosed ? (
                          <Badge color="gray">
                            <Lock className="size-3" aria-hidden />
                            Closed
                          </Badge>
                        ) : isAgency ? (
                          <Button
                            variant="ghost"
                            appearance="outline"
                            size="xs"
                            onClick={handleCloseVoting}
                          >
                            <Lock />
                            Close Voting
                          </Button>
                        ) : null
                      }
                    >
                      Decision
                    </SectionHeading>
                    <div className="space-y-1.5">
                      {task.options.map((opt) => {
                        const pct = totalVotes > 0 ? (opt._count.votes / totalVotes) * 100 : 0;
                        const isSelected = selectedOptionId === opt.id;
                        const canVote = !isAgency && !decisionClosed;
                        return (
                          <label
                            key={opt.id}
                            className={cn(
                              "relative flex items-center gap-3 overflow-hidden rounded-lg border bg-card-background px-3.5 py-2.5 transition-colors",
                              isSelected
                                ? "border-brand-500"
                                : "border-card-border",
                              canVote
                                ? "cursor-pointer hover:bg-background-gray-secondary_alt"
                                : "cursor-default",
                              decisionClosed && !isSelected && "opacity-60",
                            )}
                          >
                            {hasResults && (
                              <span
                                className="pointer-events-none absolute inset-y-0 left-0 bg-brand-500 opacity-10"
                                style={{ width: `${pct}%` }}
                                aria-hidden
                              />
                            )}
                            {canVote && (
                              <input
                                type="radio"
                                name={`vote-${task.id}`}
                                value={opt.id}
                                checked={isSelected}
                                onChange={() => setSelectedOptionId(opt.id)}
                                className="relative z-10 size-4 shrink-0 accent-brand-500"
                              />
                            )}
                            <span className="relative z-10 flex-1 text-sm text-text-primary">
                              {opt.label}
                            </span>
                            {hasResults && (
                              <span className="relative z-10 text-xs text-text-tertiary">
                                {opt._count.votes} ({Math.round(pct)}%)
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {!isAgency && !decisionClosed && (
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          onClick={handleVote}
                          disabled={!selectedOptionId || voting || selectedOptionId === currentVoteOptionId}
                        >
                          {currentVoteOptionId ? "Change Vote" : "Vote"}
                        </Button>
                      </div>
                    )}
                    {hasResults && (
                      <p className="mt-2 text-xs text-text-tertiary">
                        {totalVotes} total vote{totalVotes !== 1 ? "s" : ""}
                      </p>
                    )}
                  </Section>
                );
              })()}

              {/* Comments */}
              <Section>
                <SectionHeading>Comments</SectionHeading>
                <CommentsSection
                  targetType="task"
                  targetId={task.id}
                  commentCount={task._count?.comments ?? 0}
                  alwaysExpanded
                />
              </Section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-5 border-t border-card-border bg-background-gray-primary p-6 md:border-t-0 md:border-l">
              {/* Status */}
              <Field label="Status">
                {isAgency ? (
                  <NativeSelect
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={saving}
                    data-testid="task-status-select"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <StatusBadge status={status} label={statusOption.label} className="self-start" />
                )}
              </Field>

              {/* Assignee */}
              <Field label="Assignee">
                {isAgency && members ? (
                  <NativeSelect
                    value={assigneeId}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                    disabled={saving}
                    data-testid="task-assignee-select"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name}
                      </option>
                    ))}
                  </NativeSelect>
                ) : task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar name={task.assignee.name} image={task.assignee.image} size={24} />
                    <span className="text-sm text-text-secondary">{task.assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-text-tertiary">Unassigned</span>
                )}
              </Field>

              {/* Due date */}
              <Field label="Due date">
                {isAgency && dueEditing ? (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      autoFocus
                      aria-label="Due date"
                      className="min-w-0 flex-1"
                    />
                    <Button
                      size="sm"
                      iconOnly
                      onClick={handleSaveDueDate}
                      disabled={saving}
                      title="Save"
                      aria-label="Save"
                    >
                      <Check />
                    </Button>
                    <Button
                      variant="ghost"
                      appearance="outline"
                      size="sm"
                      iconOnly
                      onClick={() => {
                        setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
                        setDueEditing(false);
                      }}
                      title="Cancel"
                      aria-label="Cancel"
                    >
                      <X />
                    </Button>
                  </div>
                ) : isAgency ? (
                  <Button
                    variant="ghost"
                    appearance="ghost"
                    size="sm"
                    onClick={() => setDueEditing(true)}
                    className={cn(
                      "justify-start",
                      dueDate ? "text-text-secondary" : "text-text-tertiary italic",
                    )}
                  >
                    {dueDate
                      ? new Date(dueDate).toLocaleDateString()
                      : "Set due date"}
                  </Button>
                ) : (
                  <p className="text-sm text-text-secondary">
                    {dueDate ? new Date(dueDate).toLocaleDateString() : "None"}
                  </p>
                )}
              </Field>

              {/* Labels */}
              {labels && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <SidebarCaption>Labels</SidebarCaption>
                    {!readOnlyLabels && (
                      <Button
                        variant="ghost"
                        appearance="ghost"
                        size="xs"
                        onClick={() => {
                          setLabelMenuOpen((v) => !v);
                          if (labelMenuOpen) setCreatingLabel(false);
                        }}
                        aria-expanded={labelMenuOpen}
                        className="text-neutral-brand-color"
                      >
                        {labelMenuOpen ? "Done" : "Edit"}
                      </Button>
                    )}
                  </div>
                  {assignedLabelObjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {assignedLabelObjects.map((l) => (
                        <LabelBadge key={l.id} name={l.name} color={l.color} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-tertiary italic">None</p>
                  )}
                  {labelMenuOpen && !readOnlyLabels && (
                    <div className="mt-2 overflow-hidden rounded-xl border-[0.5px] border-card-border bg-card-background">
                      <div className="max-h-40 overflow-y-auto p-1">
                        {labels.length === 0 && !creatingLabel && (
                          <EmptyState
                            variant="plain"
                            title="No labels yet."
                            className="px-3 py-5"
                          />
                        )}
                        {labels.map((l) => {
                          const checked = assignedLabels.includes(l.id);
                          return (
                            <label
                              key={l.id}
                              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-text-secondary transition-colors hover:bg-background-gray-secondary_alt hover:text-text-primary"
                            >
                              <span
                                className="size-3 shrink-0 rounded-full"
                                style={{ backgroundColor: l.color }}
                                aria-hidden
                              />
                              <span className="flex-1 truncate">{l.name}</span>
                              <Checkbox
                                checked={checked}
                                onChange={() => handleToggleLabel(l.id)}
                              />
                            </label>
                          );
                        })}
                      </div>
                      {creatingLabel ? (
                        <div className="space-y-2.5 border-t border-card-border p-2.5">
                          <Input
                            type="text"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            placeholder="Label name"
                            maxLength={50}
                            autoFocus
                            aria-label="Label name"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCreateLabel();
                              if (e.key === "Escape") {
                                setCreatingLabel(false);
                                setLabelError("");
                              }
                            }}
                            className="text-sm"
                          />
                          <ColorPatchGrid value={newLabelColor} onChange={setNewLabelColor} />
                          <FieldError>{labelError}</FieldError>
                          <div className="flex gap-1.5">
                            <Button
                              size="xs"
                              onClick={handleCreateLabel}
                              disabled={!newLabelName.trim() || savingLabel}
                              className="flex-1"
                            >
                              {savingLabel ? "Creating..." : "Create"}
                            </Button>
                            <Button
                              variant="ghost"
                              appearance="outline"
                              size="xs"
                              onClick={() => {
                                setCreatingLabel(false);
                                setLabelError("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          appearance="ghost"
                          size="xs"
                          onClick={() => setCreatingLabel(true)}
                          className="w-full justify-start rounded-none border-t border-card-border text-text-tertiary hover:text-text-primary"
                        >
                          <Plus />
                          Create new label
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Requester */}
              {task.requester && (
                <div>
                  <div className="mb-1.5">
                    <SidebarCaption>Requested by</SidebarCaption>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar name={task.requester.name} image={task.requester.image} size={24} />
                    <span className="text-sm text-text-secondary">{task.requester.name}</span>
                    {task.isClientRequest && <Badge color="warning">Client</Badge>}
                  </div>
                  {task.createdAt && (
                    <p className="mt-1.5 text-xs text-text-tertiary">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </aside>
          </div>
        </ModalBody>

        {canCancel && (
          <ModalFooter>
            <Button variant="danger" appearance="outline" size="sm" onClick={handleCancelClient}>
              Cancel request
            </Button>
          </ModalFooter>
        )}
      </div>
    </Modal>
  );
}
