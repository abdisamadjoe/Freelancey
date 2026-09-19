import * as Sentry from "@sentry/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { BillingService } from "../billing/billing.service";
import { StackAuthClient } from "./stack-auth.client";
import { DEFAULT_STATUSES, DEFAULT_BRANDING } from "@/shared";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private billingService: BillingService,
    private stackAuth: StackAuthClient,
  ) {}

  /**
   * Seeds default project statuses and branding for a new organization.
   * Called after organization creation.
   */
  async seedOrganizationDefaults(organizationId: string) {
    await this.prisma.$transaction(async (tx) => {
      for (const status of DEFAULT_STATUSES) {
        await tx.projectStatus.create({
          data: {
            name: status.name,
            slug: status.slug,
            order: status.order,
            color: status.color,
            organizationId,
          },
        });
      }
      await tx.branding.create({
        data: {
          organizationId,
          primaryColor: DEFAULT_BRANDING.primaryColor,
          accentColor: DEFAULT_BRANDING.accentColor,
        },
      });
      await tx.systemSettings.create({
        data: { organizationId },
      });
    });
  }

  /** Called after a new organization is created (mirrors the old Better Auth hook). */
  async onOrganizationCreated(organizationId: string) {
    await this.seedOrganizationDefaults(organizationId);
    try {
      await this.billingService.initializeFreePlan(organizationId);
    } catch (err) {
      Sentry.captureException(err);
      this.logger.error("Failed to initialize free plan", err);
    }
  }

  /**
   * Admin-initiated password reset: asks Neon Auth to email a reset link
   * directly to the target user. Unlike Better Auth (self-hosted, so we
   * could intercept the outgoing email to capture the raw URL for the admin
   * UI to display/copy), Neon Auth sends this email from its own hosted
   * infrastructure — there's no link to hand back, only a delivery result.
   */
  async sendAdminPasswordReset(email: string): Promise<{ emailSent: boolean }> {
    const webUrl = this.config.get("WEB_URL", "http://localhost:3000");
    const emailSent = await this.stackAuth.sendPasswordResetEmail(
      email,
      `${webUrl}/reset-password`,
    );
    return { emailSent };
  }
}
