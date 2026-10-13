import { describe, expect, it, vi } from "vitest";
import { SessionMiddleware } from "./session.middleware";

function build(overrides: { userId?: string | null } = {}) {
  const betterAuth = {
    verifyAccessToken: vi.fn().mockResolvedValue(null),
    getSessionUserId: vi.fn().mockResolvedValue(overrides.userId ?? null),
  };
  const prisma = {
    member: {
      findFirst: vi.fn().mockResolvedValue({
        id: "m1",
        organizationId: "o1",
        userId: "u1",
        role: "owner",
        createdAt: new Date(),
        organization: { id: "o1", name: "Org" },
      }),
    },
  };
  const authUsers = {
    findUnique: vi.fn().mockResolvedValue({
      id: "u1",
      name: "U",
      email: "u@x.co",
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };
  return { mw: new SessionMiddleware(betterAuth as never, prisma as never, authUsers as never), betterAuth };
}

describe("SessionMiddleware cookie sessions", () => {
  it("resolves the user from the session cookie when there is no bearer token", async () => {
    const { mw, betterAuth } = build({ userId: "u1" });
    const req = { headers: { cookie: "better-auth.session_token=abc" }, cookies: {} } as never;
    const next = vi.fn();
    await mw.use(req, {} as never, next);
    expect(betterAuth.getSessionUserId).toHaveBeenCalled();
    expect((req as { user?: { id: string } }).user?.id).toBe("u1");
    expect(next).toHaveBeenCalled();
  });

  it("ignores unrelated cookies", async () => {
    const { mw, betterAuth } = build({ userId: "u1" });
    const req = { headers: { cookie: "theme=dark" }, cookies: {} } as never;
    await mw.use(req, {} as never, vi.fn());
    expect(betterAuth.getSessionUserId).not.toHaveBeenCalled();
    expect((req as { user?: unknown }).user).toBeUndefined();
  });
});
