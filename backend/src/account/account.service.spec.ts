import { describe, expect, it, vi, beforeEach } from "vitest";
import { UnauthorizedException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import type { StorageProvider } from "../files/storage/storage.interface";
import type { StackAuthClient } from "../auth/stack-auth.client";
import { AccountService } from "./account.service";

// ---------------------------------------------------------------------------
// Mock StackAuthClient
// ---------------------------------------------------------------------------
const mockStackAuth = {
  verifyPassword: vi.fn(() => Promise.resolve(true)),
  deleteUser: vi.fn(() => Promise.resolve()),
};

// ---------------------------------------------------------------------------
// Mock PrismaService
// ---------------------------------------------------------------------------
const mockPrisma = {
  member: {
    findMany: vi.fn(() => Promise.resolve([])),
    groupBy: vi.fn(() => Promise.resolve([])),
    deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  projectClient: {
    deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  file: {
    findMany: vi.fn(() => Promise.resolve([])),
    updateMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  project: {
    deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  projectStatus: {
    deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  clientProfile: {
    deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  branding: {
    deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  invoice: {
    deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  subscription: {
    deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  notification: {
    deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  pushSubscription: {
    deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  invitation: {
    deleteMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  projectUpdate: {
    updateMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  projectNote: {
    updateMany: vi.fn(() => Promise.resolve({ count: 0 })),
  },
  organization: {
    delete: vi.fn(() => Promise.resolve()),
  },
  $transaction: vi.fn((fn: (prisma: typeof mockPrisma) => unknown) => fn(mockPrisma)),
};

// ---------------------------------------------------------------------------
// Mock StorageProvider
// ---------------------------------------------------------------------------
const mockStorage = {
  upload: vi.fn(() => Promise.resolve()),
  download: vi.fn(() => Promise.resolve({ body: null, contentType: "" })),
  getSignedUrl: vi.fn(() => Promise.resolve("")),
  delete: vi.fn(() => Promise.resolve()),
};

// ---------------------------------------------------------------------------
// Mock Logger
// ---------------------------------------------------------------------------
const mockLogger = {
  info: vi.fn(() => {}),
  warn: vi.fn(() => {}),
  error: vi.fn(() => {}),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clearAllMocks() {
  mockStackAuth.verifyPassword.mockClear();
  mockStackAuth.deleteUser.mockClear();
  mockPrisma.member.findMany.mockClear();
  mockPrisma.member.groupBy.mockClear();
  mockPrisma.member.deleteMany.mockClear();
  mockPrisma.projectClient.deleteMany.mockClear();
  mockPrisma.file.findMany.mockClear();
  mockPrisma.file.updateMany.mockClear();
  mockPrisma.project.deleteMany.mockClear();
  mockPrisma.projectStatus.deleteMany.mockClear();
  mockPrisma.clientProfile.deleteMany.mockClear();
  mockPrisma.branding.deleteMany.mockClear();
  mockPrisma.invoice.deleteMany.mockClear();
  mockPrisma.subscription.deleteMany.mockClear();
  mockPrisma.notification.deleteMany.mockClear();
  mockPrisma.pushSubscription.deleteMany.mockClear();
  mockPrisma.invitation.deleteMany.mockClear();
  mockPrisma.projectUpdate.updateMany.mockClear();
  mockPrisma.projectNote.updateMany.mockClear();
  mockPrisma.organization.delete.mockClear();
  mockPrisma.$transaction.mockClear();
  mockStorage.delete.mockClear();
  mockLogger.info.mockClear();
  mockLogger.warn.mockClear();

  // Reset default implementations
  mockStackAuth.verifyPassword.mockImplementation(() => Promise.resolve(true));
  mockPrisma.member.findMany.mockImplementation(() => Promise.resolve([]));
  mockPrisma.member.groupBy.mockImplementation(() => Promise.resolve([]));
  mockPrisma.file.findMany.mockImplementation(() => Promise.resolve([]));
  mockPrisma.$transaction.mockImplementation(
    (fn: (prisma: typeof mockPrisma) => unknown) => fn(mockPrisma),
  );
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe("AccountService", () => {
  let service: AccountService;

  beforeEach(() => {
    clearAllMocks();
    service = new AccountService(
      mockPrisma as unknown as PrismaService,
      mockStackAuth as unknown as StackAuthClient,
      mockStorage as unknown as StorageProvider,
      mockLogger as never,
    );
  });

  // =========================================================================
  // getDeletionInfo
  // =========================================================================
  describe("getDeletionInfo", () => {
    it("returns empty ownedOrganizations for non-owner user", async () => {
      mockPrisma.member.findMany.mockImplementation(() => Promise.resolve([]));

      const result = await service.getDeletionInfo("user-1");

      expect(result).toEqual({ ownedOrganizations: [] });
      expect(mockPrisma.member.groupBy).not.toHaveBeenCalled();
    });

    it("returns org info with correct isSoleOwner and memberCount", async () => {
      mockPrisma.member.findMany.mockImplementation(() =>
        Promise.resolve([
          {
            organizationId: "org-1",
            role: "owner",
            organization: { id: "org-1", name: "Acme Corp" },
          },
        ]),
      );

      // First groupBy call: memberCounts; second: ownerCounts
      let groupByCallIndex = 0;
      mockPrisma.member.groupBy.mockImplementation(() => {
        groupByCallIndex++;
        if (groupByCallIndex === 1) {
          // total members
          return Promise.resolve([{ organizationId: "org-1", _count: 3 }]);
        }
        // owner count = 1 => sole owner
        return Promise.resolve([{ organizationId: "org-1", _count: 1 }]);
      });

      const result = await service.getDeletionInfo("user-1");

      expect(result.ownedOrganizations).toHaveLength(1);
      expect(result.ownedOrganizations[0]).toEqual({
        id: "org-1",
        name: "Acme Corp",
        isSoleOwner: true,
        memberCount: 3,
      });
    });

    it("handles multiple owned orgs with different owner counts", async () => {
      mockPrisma.member.findMany.mockImplementation(() =>
        Promise.resolve([
          {
            organizationId: "org-1",
            role: "owner",
            organization: { id: "org-1", name: "Acme Corp" },
          },
          {
            organizationId: "org-2",
            role: "owner",
            organization: { id: "org-2", name: "Beta Inc" },
          },
        ]),
      );

      let groupByCallIndex = 0;
      mockPrisma.member.groupBy.mockImplementation(() => {
        groupByCallIndex++;
        if (groupByCallIndex === 1) {
          // total members per org
          return Promise.resolve([
            { organizationId: "org-1", _count: 5 },
            { organizationId: "org-2", _count: 2 },
          ]);
        }
        // owner counts: org-1 has 1 owner (sole), org-2 has 2 owners (not sole)
        return Promise.resolve([
          { organizationId: "org-1", _count: 1 },
          { organizationId: "org-2", _count: 2 },
        ]);
      });

      const result = await service.getDeletionInfo("user-1");

      expect(result.ownedOrganizations).toHaveLength(2);

      const org1 = result.ownedOrganizations.find((o) => o.id === "org-1")!;
      expect(org1.isSoleOwner).toBe(true);
      expect(org1.memberCount).toBe(5);

      const org2 = result.ownedOrganizations.find((o) => o.id === "org-2")!;
      expect(org2.isSoleOwner).toBe(false);
      expect(org2.memberCount).toBe(2);
    });
  });

  // =========================================================================
  // deleteAccount
  // =========================================================================
  describe("deleteAccount", () => {
    it("throws UnauthorizedException for incorrect password", async () => {
      mockStackAuth.verifyPassword.mockImplementation(() => Promise.resolve(false));

      try {
        await service.deleteAccount("user-1", "wrong-password");
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(UnauthorizedException);
        expect((e as UnauthorizedException).message).toBe("Password verification failed.");
      }
    });

    it("deletes orgs where user is sole owner", async () => {
      // User is owner of org-1 (sole) and member of org-2
      mockPrisma.member.findMany.mockImplementation(() =>
        Promise.resolve([
          { organizationId: "org-1", role: "owner" },
          { organizationId: "org-2", role: "member" },
        ]),
      );
      // No other owners for org-1
      mockPrisma.member.groupBy.mockImplementation(() => Promise.resolve([]));

      await service.deleteAccount("user-1", "correct-password");

      expect(mockPrisma.organization.delete).toHaveBeenCalledWith({
        where: { id: "org-1" },
      });
    });

    it("does not delete orgs where other owners exist", async () => {
      mockPrisma.member.findMany.mockImplementation(() =>
        Promise.resolve([
          { organizationId: "org-1", role: "owner" },
        ]),
      );
      // Another owner exists for org-1
      mockPrisma.member.groupBy.mockImplementation(() =>
        Promise.resolve([{ organizationId: "org-1", _count: 1 }]),
      );

      await service.deleteAccount("user-1", "correct-password");

      expect(mockPrisma.organization.delete).not.toHaveBeenCalled();
    });

    it("anonymizes content in remaining orgs with DELETED_USER_SENTINEL", async () => {
      // User is owner of org-1 (sole owner) and member of org-2 (remaining)
      mockPrisma.member.findMany.mockImplementation(() =>
        Promise.resolve([
          { organizationId: "org-1", role: "owner" },
          { organizationId: "org-2", role: "member" },
        ]),
      );
      // No other owners for org-1
      mockPrisma.member.groupBy.mockImplementation(() => Promise.resolve([]));

      await service.deleteAccount("user-1", "correct-password");

      // projectUpdate.updateMany should set authorId to sentinel for org-2
      expect(mockPrisma.projectUpdate.updateMany).toHaveBeenCalledWith({
        where: { authorId: "user-1", organizationId: { in: ["org-2"] } },
        data: { authorId: "deleted" },
      });

      expect(mockPrisma.projectNote.updateMany).toHaveBeenCalledWith({
        where: { authorId: "user-1", organizationId: { in: ["org-2"] } },
        data: { authorId: "deleted" },
      });

      expect(mockPrisma.file.updateMany).toHaveBeenCalledWith({
        where: { uploadedById: "user-1", organizationId: { in: ["org-2"] } },
        data: { uploadedById: "deleted" },
      });

      // Membership in the remaining org must still be explicitly removed —
      // there's no more FK cascade from a local User row to rely on.
      expect(mockPrisma.member.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1", organizationId: { in: ["org-2"] } },
      });
    });

    it("deletes the Stack Auth identity after local cleanup", async () => {
      await service.deleteAccount("user-1", "correct-password");

      expect(mockStackAuth.deleteUser).toHaveBeenCalledWith("user-1");
    });

    it("collects and purges file storage keys for deleted orgs", async () => {
      mockPrisma.member.findMany.mockImplementation(() =>
        Promise.resolve([
          { organizationId: "org-1", role: "owner" },
        ]),
      );
      // No other owners => org-1 will be deleted
      mockPrisma.member.groupBy.mockImplementation(() => Promise.resolve([]));

      mockPrisma.file.findMany.mockImplementation(() =>
        Promise.resolve([
          { storageKey: "org-1/proj/file-a.pdf" },
          { storageKey: "org-1/proj/file-b.png" },
        ]),
      );

      await service.deleteAccount("user-1", "correct-password");

      // Storage keys should be queried for the org being deleted, scoped to
      // UPLOAD-type files with a non-null storageKey (link-type files have no
      // storage to purge).
      expect(mockPrisma.file.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: { in: ["org-1"] },
          type: "UPLOAD",
          storageKey: { not: null },
        },
        select: { storageKey: true },
      });

      // storage.delete should be called for each key
      // Give the fire-and-forget Promise.allSettled time to resolve
      await new Promise((r) => setTimeout(r, 10));
      expect(mockStorage.delete).toHaveBeenCalledTimes(2);
    });

    it("does not query file storage when no orgs are being deleted", async () => {
      // User is only a member, not an owner
      mockPrisma.member.findMany.mockImplementation(() =>
        Promise.resolve([
          { organizationId: "org-1", role: "member" },
        ]),
      );

      await service.deleteAccount("user-1", "correct-password");

      // file.findMany for storage keys should NOT be called
      expect(mockPrisma.file.findMany).not.toHaveBeenCalled();
      expect(mockStorage.delete).not.toHaveBeenCalled();
    });

    it("handles non-owner users: no orgs to delete, removes all memberships", async () => {
      mockPrisma.member.findMany.mockImplementation(() =>
        Promise.resolve([
          { organizationId: "org-1", role: "member" },
          { organizationId: "org-2", role: "admin" },
        ]),
      );

      await service.deleteAccount("user-1", "correct-password");

      // Should NOT delete any orgs
      expect(mockPrisma.organization.delete).not.toHaveBeenCalled();

      // Should NOT call groupBy (no owner orgs to check)
      expect(mockPrisma.member.groupBy).not.toHaveBeenCalled();

      // Should anonymize in all orgs (all are "remaining")
      expect(mockPrisma.projectUpdate.updateMany).toHaveBeenCalledWith({
        where: { authorId: "user-1", organizationId: { in: ["org-1", "org-2"] } },
        data: { authorId: "deleted" },
      });

      // Should remove membership rows explicitly
      expect(mockPrisma.member.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1", organizationId: { in: ["org-1", "org-2"] } },
      });

      // Should delete the Stack Auth identity
      expect(mockStackAuth.deleteUser).toHaveBeenCalledWith("user-1");
    });

    it("runs org deletion within a transaction", async () => {
      await service.deleteAccount("user-1", "correct-password");

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("cleans up user-level data (clientProfile, invitation, projectClient) before finishing", async () => {
      await service.deleteAccount("user-1", "correct-password");

      expect(mockPrisma.clientProfile.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(mockPrisma.invitation.deleteMany).toHaveBeenCalledWith({
        where: { inviterId: "user-1" },
      });
      expect(mockPrisma.projectClient.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });
  });
});
