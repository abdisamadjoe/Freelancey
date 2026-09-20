import { describe, expect, it, vi } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { ClientsService } from "./clients.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuthService } from "../auth/auth.service";
import type { NeonAuthUsersRepository } from "../auth/neon-auth-users.repository";
import type { MailService } from "../mail/mail.service";
import type { ConfigService } from "@nestjs/config";

function build() {
  const invitationCreate = vi.fn((args: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: "inv-1", ...args.data }),
  );
  const send = vi.fn(() => Promise.resolve());
  const service = new ClientsService(
    { invitation: { create: invitationCreate } } as unknown as PrismaService,
    {} as AuthService,
    { send } as unknown as MailService,
    { get: vi.fn((_k: string, fallback?: string) => fallback) } as unknown as ConfigService,
    {} as NeonAuthUsersRepository,
  );
  return { service, invitationCreate, send };
}

describe("ClientsService.inviteMember role rules", () => {
  it("rejects an admin inviting an owner and creates nothing", async () => {
    const { service, invitationCreate, send } = build();
    await expect(
      service.inviteMember("a@x.com", "owner", "org-1", "u1", "Admin", "Org", "admin"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(invitationCreate).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("allows an owner to invite an owner", async () => {
    const { service, invitationCreate } = build();
    await service.inviteMember("a@x.com", "owner", "org-1", "u1", "Owner", "Org", "owner");
    expect(invitationCreate).toHaveBeenCalledOnce();
  });

  it("allows an admin to invite an admin or a client", async () => {
    const { service, invitationCreate } = build();
    await service.inviteMember("a@x.com", "admin", "org-1", "u1", "Admin", "Org", "admin");
    await service.inviteMember("b@x.com", "member", "org-1", "u1", "Admin", "Org", "admin");
    expect(invitationCreate).toHaveBeenCalledTimes(2);
  });
});
