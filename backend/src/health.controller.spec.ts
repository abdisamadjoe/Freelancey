import { describe, expect, it, vi } from "vitest";
import { HttpException } from "@nestjs/common";
import { HealthController } from "./health.controller";
import type { PrismaService } from "./prisma/prisma.service";
import type { ConfigService } from "@nestjs/config";

const makePrisma = (opts: { dbOk: boolean }) => ({
  $queryRaw: opts.dbOk
    ? vi.fn(() => Promise.resolve([1]))
    : vi.fn(() => Promise.reject(new Error("Connection refused"))),
});

const makeConfig = (vals: Record<string, string> = {}) =>
  ({ get: (key: string) => vals[key] }) as unknown as ConfigService;

describe("HealthController", () => {
  it("returns ok status when DB is connected", async () => {
    const controller = new HealthController(makePrisma({ dbOk: true }) as unknown as PrismaService, makeConfig());
    const result = await controller.check();
    expect(result.status).toBe("ok");
    expect(result.database).toBe("connected");
    expect(result.timestamp).toBeDefined();
  });

  it("throws 503 when DB fails", async () => {
    const controller = new HealthController(makePrisma({ dbOk: false }) as unknown as PrismaService, makeConfig());
    try {
      await controller.check();
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      const err = e as HttpException;
      expect(err.getStatus()).toBe(503);
      const body = err.getResponse() as Record<string, unknown>;
      expect(body.status).toBe("degraded");
      expect(body.database).toBe("disconnected");
    }
  });

  describe("getConfig", () => {
    it("reports signupEnabled true by default", () => {
      const controller = new HealthController(
        makePrisma({ dbOk: true }) as unknown as PrismaService,
        makeConfig(),
      );
      expect(controller.getConfig().signupEnabled).toBe(true);
    });

    it("reports signupEnabled false when ALLOW_SIGNUPS is 'false'", () => {
      const controller = new HealthController(
        makePrisma({ dbOk: true }) as unknown as PrismaService,
        makeConfig({ ALLOW_SIGNUPS: "false" }),
      );
      expect(controller.getConfig().signupEnabled).toBe(false);
    });
  });
});
