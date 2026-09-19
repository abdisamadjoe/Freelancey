import { describe, expect, it } from "vitest";
import { RolesGuard } from "./roles.guard";
import { Reflector } from "@nestjs/core";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";

function createMockContext(member: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ member }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  it("allows when no roles required", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => undefined;
    const guard = new RolesGuard(reflector);
    const ctx = createMockContext(null);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("allows matching role", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => ["owner", "admin"];
    const guard = new RolesGuard(reflector);
    const ctx = createMockContext({ role: "admin" });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("rejects non-matching role", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => ["owner", "admin"];
    const guard = new RolesGuard(reflector);
    const ctx = createMockContext({ role: "member" });
    try {
      guard.canActivate(ctx);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
    }
  });

  it("rejects missing member", () => {
    const reflector = new Reflector();
    reflector.getAllAndOverride = () => ["owner"];
    const guard = new RolesGuard(reflector);
    const ctx = createMockContext(null);
    try {
      guard.canActivate(ctx);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenException);
    }
  });
});
