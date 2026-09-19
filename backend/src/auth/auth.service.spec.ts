import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthService } from "./auth.service";
import type { ConfigService } from "@nestjs/config";
import type { PrismaService } from "../prisma/prisma.service";
import type { BillingService } from "../billing/billing.service";
import type { StackAuthClient } from "./stack-auth.client";

const mockConfig = {
  get: vi.fn((key: string, fallback?: string) => {
    if (key === "WEB_URL") return "http://localhost:3000";
    return fallback;
  }),
};

const mockPrisma = {
  $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
    fn({
      projectStatus: { create: vi.fn(() => Promise.resolve({})) },
      branding: { create: vi.fn(() => Promise.resolve({})) },
      systemSettings: { create: vi.fn(() => Promise.resolve({})) },
    }),
  ),
};

const mockBilling = { initializeFreePlan: vi.fn(() => Promise.resolve()) };
const mockStackAuth = { sendPasswordResetEmail: vi.fn(() => Promise.resolve(true)) };

function makeService(): AuthService {
  return new AuthService(
    mockConfig as unknown as ConfigService,
    mockPrisma as unknown as PrismaService,
    mockBilling as unknown as BillingService,
    mockStackAuth as unknown as StackAuthClient,
  );
}

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    service = makeService();
    mockPrisma.$transaction.mockClear();
    mockBilling.initializeFreePlan.mockClear();
    mockStackAuth.sendPasswordResetEmail.mockClear();
  });

  describe("seedOrganizationDefaults", () => {
    it("runs default status/branding/settings creation in a transaction", async () => {
      await service.seedOrganizationDefaults("org-1");
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe("onOrganizationCreated", () => {
    it("seeds defaults and initializes the free plan", async () => {
      await service.onOrganizationCreated("org-1");

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockBilling.initializeFreePlan).toHaveBeenCalledWith("org-1");
    });

    it("does not throw when billing initialization fails", async () => {
      mockBilling.initializeFreePlan.mockRejectedValueOnce(new Error("billing down"));

      await expect(service.onOrganizationCreated("org-1")).resolves.toBeUndefined();
    });
  });

  describe("sendAdminPasswordReset", () => {
    it("asks Neon Auth to email a reset link and reports success", async () => {
      const result = await service.sendAdminPasswordReset("alice@example.com");

      expect(result).toEqual({ emailSent: true });
      expect(mockStackAuth.sendPasswordResetEmail).toHaveBeenCalledWith(
        "alice@example.com",
        "http://localhost:3000/reset-password",
      );
    });

    it("reports emailSent=false when delivery fails", async () => {
      mockStackAuth.sendPasswordResetEmail.mockResolvedValueOnce(false);

      const result = await service.sendAdminPasswordReset("alice@example.com");

      expect(result).toEqual({ emailSent: false });
    });
  });
});
