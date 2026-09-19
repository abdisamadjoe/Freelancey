import { describe, expect, it, vi, beforeEach } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { OnboardingController } from "./onboarding.controller";
import type { AuthService } from "../auth/auth.service";
import type { BillingService } from "../billing/billing.service";
import type { MailService } from "../mail/mail.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { ConfigService } from "@nestjs/config";
import type { SignupDto } from "./signup.dto";

const makeConfig = (vals: Record<string, string> = {}) =>
  ({ get: (key: string, def?: string) => vals[key] ?? def }) as unknown as ConfigService;

const makeLogger = () =>
  ({ error: vi.fn(() => {}), warn: vi.fn(() => {}), info: vi.fn(() => {}) }) as unknown as never;

const mockAuthService = { onOrganizationCreated: vi.fn(() => Promise.resolve()) };
const mockBilling = { createCheckoutSession: vi.fn(() => Promise.resolve({ url: "https://checkout" })) };
const mockMail = { send: vi.fn(() => Promise.resolve()) };
const mockPrisma = {
  organization: {
    create: vi.fn(() => Promise.resolve({ id: "org-1", name: "Acme", slug: "acme-xyz" })),
  },
};

const body: SignupDto = { orgName: "Acme" };

function makeController(config: ConfigService) {
  return new OnboardingController(
    mockAuthService as unknown as AuthService,
    mockBilling as unknown as BillingService,
    config,
    mockMail as unknown as MailService,
    mockPrisma as unknown as PrismaService,
    makeLogger(),
  );
}

describe("OnboardingController", () => {
  beforeEach(() => {
    mockAuthService.onOrganizationCreated.mockClear();
    mockBilling.createCheckoutSession.mockClear();
    mockMail.send.mockClear();
    mockPrisma.organization.create.mockClear();
  });

  it("throws ForbiddenException when ALLOW_SIGNUPS is false", async () => {
    const controller = makeController(makeConfig({ ALLOW_SIGNUPS: "false" }));

    await expect(
      controller.signup(body, "user-1", "a@b.com", "Alice"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockPrisma.organization.create).not.toHaveBeenCalled();
  });

  it("creates the organization with the requesting user as owner", async () => {
    const controller = makeController(makeConfig());

    const result = await controller.signup(body, "user-1", "a@b.com", "Alice");

    expect(result).toEqual({ success: true, organizationId: "org-1" });
    expect(mockPrisma.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Acme",
          members: { create: { userId: "user-1", role: "owner" } },
        }),
      }),
    );
    expect(mockAuthService.onOrganizationCreated).toHaveBeenCalledWith("org-1");
  });

  it("does not attempt checkout for the free plan", async () => {
    const controller = makeController(makeConfig({ BILLING_ENABLED: "true" }));

    await controller.signup({ ...body, planSlug: "free" }, "user-1", "a@b.com", "Alice");

    expect(mockBilling.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("creates a checkout session for a paid plan when billing is enabled", async () => {
    const controller = makeController(makeConfig({ BILLING_ENABLED: "true" }));

    const result = await controller.signup(
      { ...body, planSlug: "pro" },
      "user-1",
      "a@b.com",
      "Alice",
    );

    expect(mockBilling.createCheckoutSession).toHaveBeenCalledWith(
      "org-1",
      "pro",
      expect.stringContaining("/setup?checkout=success"),
      expect.stringContaining("/setup?checkout=cancelled"),
    );
    expect(result).toEqual({ success: true, organizationId: "org-1", checkoutUrl: "https://checkout" });
  });
});
