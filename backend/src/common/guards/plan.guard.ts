import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { PLAN_LIMIT_KEY, PlanLimitResource } from "../decorators/plan-limit.decorator";
import { BillingService } from "../../billing/billing.service";

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private config: ConfigService,
    private billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.getAllAndOverride<PlanLimitResource>(
      PLAN_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @PlanLimit decorator → pass through
    if (!resource) return true;

    // Self-hosted mode → no billing enforcement
    if (this.config.get("BILLING_ENABLED", "false") !== "true") return true;

    const request = context.switchToHttp().getRequest();
    const orgId: string | undefined = request.organization?.id;

    // No org context (public route, etc.) → pass through
    if (!orgId) return true;

    const [subscription, usage] = await Promise.all([
      this.billingService.getSubscription(orgId),
      this.billingService.getUsage(orgId),
    ]);

    // No subscription record → pass through (shouldn't happen if billing initialized)
    if (!subscription) return true;

    const plan = subscription.plan;
    let limit: number;
    let current: number;
    let label: string;

    switch (resource) {
      case "projects":
        limit = plan.maxProjects;
        current = usage.projects;
        label = "projects";
        break;
      case "storage":
        limit = plan.maxStorageMb;
        current = usage.storageMb;
        label = "storage (MB)";
        break;
      case "members":
        limit = plan.maxMembers;
        current = usage.members;
        label = "team members";
        break;
      case "clients":
        limit = plan.maxClients;
        current = usage.clients;
        label = "clients";
        break;
    }

    // -1 means unlimited
    if (limit === -1) return true;

    if (current >= limit) {
      throw new ForbiddenException(
        `You've reached the ${label} limit (${current}/${limit}) on your ${plan.name} plan. Please upgrade to continue.`,
      );
    }

    return true;
  }
}
