import { SetMetadata } from "@nestjs/common";

export type PlanLimitResource = "projects" | "storage" | "members" | "clients";

export const PLAN_LIMIT_KEY = "planLimit";
export const PlanLimit = (resource: PlanLimitResource) =>
  SetMetadata(PLAN_LIMIT_KEY, resource);
