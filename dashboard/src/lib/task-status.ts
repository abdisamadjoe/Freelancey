import type { BadgeColor } from "@/lib/badge-color";

export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

export const TASK_STATUS_COLOR: Record<TaskStatus, BadgeColor> = {
  open: "gray",
  in_progress: "blue",
  done: "success",
  cancelled: "error",
};

export const TASK_STATUS_OPTIONS = (Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map((value) => ({
  value,
  label: TASK_STATUS_LABEL[value],
}));

export function getTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABEL[status as TaskStatus] ?? status;
}

export function getTaskStatusColor(status: string): BadgeColor {
  return TASK_STATUS_COLOR[status as TaskStatus] ?? "gray";
}
