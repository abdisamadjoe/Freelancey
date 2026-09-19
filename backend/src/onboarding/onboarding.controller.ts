import {
  Body,
  Controller,
  Post,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { render } from "@react-email/render";
import { WelcomeEmail } from "@/email";
import { CurrentUser } from "../common";
import { UserOnlyAuthGuard } from "../account/user-only-auth.guard";
import { AuthService } from "../auth/auth.service";
import { BillingService } from "../billing/billing.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { SignupDto } from "./signup.dto";
import { ROLES } from "@/shared";

/**
 * Runs after the frontend has already created the user in Neon Auth (Stack
 * Auth) via its SDK and is calling us with a valid bearer token — this
 * endpoint's job is now just "create my first organization", not "create an
 * account" (Better Auth used to do both in one round trip here).
 */
@Controller("onboarding")
@UseGuards(UserOnlyAuthGuard)
export class OnboardingController {
  constructor(
    private authService: AuthService,
    private billingService: BillingService,
    private config: ConfigService,
    private mail: MailService,
    private prisma: PrismaService,
    @InjectPinoLogger(OnboardingController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Post("signup")
  @Throttle({ default: { ttl: 60000, limit: parseInt(process.env.SIGNUP_THROTTLE_LIMIT || "5", 10) } })
  async signup(
    @Body() body: SignupDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("email") userEmail: string,
    @CurrentUser("name") userName: string,
  ) {
    if (this.config.get("ALLOW_SIGNUPS") === "false") {
      throw new ForbiddenException("Signups are disabled");
    }

    const baseSlug = body.orgName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    // Append random suffix to avoid slug collisions from orgs with the same name
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

    const organization = await this.prisma.organization.create({
      data: {
        name: body.orgName,
        slug,
        members: {
          create: { userId, role: ROLES.OWNER },
        },
      },
    });

    await this.authService.onOrganizationCreated(organization.id);

    // Send welcome email (fire and forget)
    const webUrl = this.config.get("WEB_URL", "http://localhost:3000");
    render(
      WelcomeEmail({
        name: userName || userEmail,
        organizationName: body.orgName,
        portalUrl: `${webUrl}/dashboard`,
      }),
    )
      .then((html) => this.mail.send(userEmail, `Welcome to ${body.orgName}`, html))
      .catch((err) => {
        this.logger.warn({ err }, "Failed to send welcome email");
      });

    // Create checkout session for paid plans
    const billingEnabled = this.config.get("BILLING_ENABLED", "false");
    if (billingEnabled === "true" && body.planSlug && body.planSlug !== "free") {
      try {
        const successUrl = `${webUrl}/setup?checkout=success`;
        const cancelUrl = `${webUrl}/setup?checkout=cancelled`;
        const result = await this.billingService.createCheckoutSession(
          organization.id,
          body.planSlug,
          successUrl,
          cancelUrl,
        );
        return { success: true, organizationId: organization.id, checkoutUrl: result.url };
      } catch (err) {
        this.logger.warn(
          { err, planSlug: body.planSlug, orgId: organization.id },
          "Failed to create checkout session during signup, falling back to free plan",
        );
      }
    }

    return { success: true, organizationId: organization.id };
  }
}
