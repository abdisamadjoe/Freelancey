import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { SessionMiddleware } from "./session.middleware";
import type { PrismaService } from "../prisma/prisma.service";
import type { StackAuthClient } from "./stack-auth.client";
import type { NeonAuthUsersRepository } from "./neon-auth-users.repository";

const user = { id: "u1", name: "U", email: "u@x.com", emailVerified: true, image: null, createdAt: new Date(), updatedAt: new Date() };
const membership = (organizationId: string) => ({
  id: `m-${organizationId}`,
  organizationId,
  userId: "u1",
  role: "member",
  createdAt: new Date(),
  organization: { id: organizationId, name: organizationId },
});

function build() {
  const findFirst = vi.fn().mockResolvedValue(null);
  const verify = vi.fn().mockResolvedValue({ sub: "u1" });
  const findUnique = vi.fn().mockResolvedValue(user);
  const mw = new SessionMiddleware(
    { verifyAccessToken: verify } as unknown as StackAuthClient,
    { member: { findFirst } } as unknown as PrismaService,
    { findUnique } as unknown as NeonAuthUsersRepository,
  );
  const call = async (token: string | undefined, cookie?: string) => {
    const req = {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      cookies: cookie ? { active_org: cookie } : {},
    } as unknown as Request & Record<string, unknown>;
    await mw.use(req, {} as never, () => {});
    return req as unknown as { user?: { id: string }; organization?: { id: string }; member?: { organizationId: string } };
  };
  return { call, findFirst, verify };
}

describe("SessionMiddleware", () => {
  let t: ReturnType<typeof build>;
  beforeEach(() => {
    t = build();
  });

  it("does not remember a user who has no workspace yet, so joining one takes effect immediately", async () => {
    const first = await t.call("tok");
    expect(first.user?.id).toBe("u1");
    expect(first.organization).toBeUndefined();

    // the invitation is accepted; the same JWT is reused by the browser
    t.findFirst.mockResolvedValue(membership("org-1"));
    const second = await t.call("tok");
    expect(second.organization?.id).toBe("org-1");
    expect(second.member?.organizationId).toBe("org-1");
  });

  it("still caches a resolved session, so a busy client does not hit the database on every request", async () => {
    t.findFirst.mockResolvedValue(membership("org-1"));
    await t.call("tok");
    await t.call("tok");
    await t.call("tok");
    expect(t.findFirst).toHaveBeenCalledTimes(1);
    expect(t.verify).toHaveBeenCalledTimes(1);
  });

  it("re-resolves when the active workspace cookie changes, with the same token", async () => {
    t.findFirst.mockImplementation(async (args: { where: { organizationId?: string } }) =>
      membership(args.where.organizationId ?? "org-default"),
    );
    const a = await t.call("tok", "org-a");
    const b = await t.call("tok", "org-b");
    expect(a.organization?.id).toBe("org-a");
    expect(b.organization?.id).toBe("org-b");
    // and going back is served from the cache without leaking the other workspace
    const a2 = await t.call("tok", "org-a");
    expect(a2.organization?.id).toBe("org-a");
    expect(t.findFirst).toHaveBeenCalledTimes(2);
  });

  it("only honours a workspace cookie the user is a member of", async () => {
    t.findFirst.mockResolvedValue(null); // not a member of org-x
    const req = await t.call("tok", "org-x");
    expect(req.organization).toBeUndefined();
    expect(t.findFirst.mock.calls[0][0].where).toEqual({ userId: "u1", organizationId: "org-x" });
  });

  it("ignores requests without a valid token", async () => {
    expect((await t.call(undefined)).user).toBeUndefined();
    t.verify.mockResolvedValue(null);
    expect((await t.call("bad")).user).toBeUndefined();
  });
});
