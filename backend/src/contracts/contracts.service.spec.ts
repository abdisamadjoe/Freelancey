import { describe, it, expect, beforeEach, vi } from "vitest";
import { ContractsService } from "./contracts.service";
import { NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";

describe("ContractsService", () => {
  let service: ContractsService;
  let prismaMock: any;
  let pdfServiceMock: any;
  let neonAuthUsersMock: any;

  beforeEach(() => {
    prismaMock = {
      project: { findFirst: vi.fn() },
      organization: { findUnique: vi.fn() },
      clientProfile: { findUnique: vi.fn() },
      contract: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
      contractVersion: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
      projectClient: { findFirst: vi.fn() },
      activityLog: { create: vi.fn() },
    };

    pdfServiceMock = {
      render: vi.fn(),
    };

    neonAuthUsersMock = {
      findUnique: vi.fn(),
    };

    service = new ContractsService(
      prismaMock,
      pdfServiceMock,
      neonAuthUsersMock,
    );
  });

  describe("create", () => {
    it("creates a draft contract with auto-populated template content", async () => {
      prismaMock.project.findFirst.mockResolvedValue({
        id: "proj_1",
        name: "Website Redesign",
        description: "Complete redesign",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-01"),
        hourlyRateCents: 10000,
        tasks: [{ title: "Homepage Layout", description: "Design mockups" }],
        clients: [{ userId: "user_client_1" }],
      });
      prismaMock.organization.findUnique.mockResolvedValue({ name: "Acme Agency" });
      neonAuthUsersMock.findUnique.mockResolvedValue({ name: "John Client", email: "client@example.com" });
      prismaMock.clientProfile.findUnique.mockResolvedValue({ company: "Client Co", address: "123 Main St" });

      prismaMock.contract.create.mockResolvedValue({
        id: "contract_1",
        title: "Website Development Agreement",
        template: "website-development",
        status: "draft",
        version: 1,
      });

      const result = await service.create(
        "proj_1",
        { title: "Website Development Agreement", template: "website-development" },
        "org_1",
        "user_admin_1",
      );

      expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
        where: { id: "proj_1", organizationId: "org_1" },
        include: { tasks: { select: { title: true, description: true } }, clients: true },
      });
      expect(prismaMock.contract.create).toHaveBeenCalled();
      expect(prismaMock.activityLog.create).toHaveBeenCalled();
      expect(result.id).toBe("contract_1");
    });

    it("throws NotFoundException if project does not exist", async () => {
      prismaMock.project.findFirst.mockResolvedValue(null);

      await expect(
        service.create("proj_missing", { title: "Test", template: "custom" }, "org_1", "user_1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("renderPdf", () => {
    const stored = {
      id: "contract_1",
      title: "Web Contract",
      version: 2,
      status: "sent",
      content: { current: true },
      project: { name: "Website" },
    };

    it("renders the current content on the fly without persisting anything", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(stored);
      pdfServiceMock.render.mockResolvedValue({ buffer: Buffer.from("PDF"), filename: "x.pdf" });

      const result = await service.renderPdf("contract_1", "org_1");

      expect(pdfServiceMock.render).toHaveBeenCalledWith(
        expect.objectContaining({ version: 2, projectName: "Website", content: { current: true } }),
        "org_1",
      );
      expect(prismaMock.contract.update).not.toHaveBeenCalled();
      expect(prismaMock.contractVersion.upsert).not.toHaveBeenCalled();
      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it("renders an older version from its content snapshot", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(stored);
      prismaMock.contractVersion.findUnique.mockResolvedValue({ version: 1, content: { old: true } });
      pdfServiceMock.render.mockResolvedValue({ buffer: Buffer.from("PDF"), filename: "x.pdf" });

      await service.renderPdf("contract_1", "org_1", 1);

      expect(pdfServiceMock.render).toHaveBeenCalledWith(
        expect.objectContaining({ version: 1, content: { old: true } }),
        "org_1",
      );
    });

    it("throws NotFoundException for an unknown version", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(stored);
      prismaMock.contractVersion.findUnique.mockResolvedValue(null);

      await expect(service.renderPdf("contract_1", "org_1", 9)).rejects.toThrow(NotFoundException);
    });
  });

  describe("send", () => {
    it("snapshots the content as a version and marks the contract sent", async () => {
      prismaMock.contract.findFirst.mockResolvedValue({
        id: "contract_1",
        projectId: "proj_1",
        title: "Web Contract",
        version: 1,
        status: "draft",
        content: { a: 1 },
      });
      prismaMock.contractVersion.upsert.mockResolvedValue({});
      prismaMock.contract.update.mockResolvedValue({ id: "contract_1", status: "sent" });

      const result = await service.send("contract_1", "org_1", "user_1");

      expect(prismaMock.contractVersion.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ version: 1, content: { a: 1 } }) }),
      );
      expect(result.status).toBe("sent");
    });

    it("refuses to send a contract that is already sent", async () => {
      prismaMock.contract.findFirst.mockResolvedValue({ id: "c", status: "sent" });

      await expect(service.send("c", "org_1", "user_1")).rejects.toThrow(BadRequestException);
    });
  });

  describe("update", () => {
    it("starts a new draft version when editing a contract that was already sent", async () => {
      prismaMock.contract.findFirst.mockResolvedValue({ id: "c", status: "sent", version: 1 });
      prismaMock.contract.update.mockResolvedValue({});

      await service.update("c", { content: { x: 1 } as any }, "org_1");

      expect(prismaMock.contract.update).toHaveBeenCalledWith({
        where: { id: "c" },
        data: expect.objectContaining({ version: 2, status: "draft" }),
      });
    });

    it("keeps the version when editing a draft", async () => {
      prismaMock.contract.findFirst.mockResolvedValue({ id: "c", status: "draft", version: 1 });
      prismaMock.contract.update.mockResolvedValue({});

      await service.update("c", { content: { x: 1 } as any }, "org_1");

      const data = prismaMock.contract.update.mock.calls[0][0].data;
      expect(data.version).toBeUndefined();
    });
  });

  describe("duplicate", () => {
    it("duplicates contract into draft status with version 1", async () => {
      prismaMock.contract.findFirst.mockResolvedValue({
        id: "c1",
        projectId: "p1",
        clientId: "cl1",
        title: "Agreement",
        template: "custom",
        content: { key: "val" },
      });

      prismaMock.contract.create.mockResolvedValue({
        id: "c2",
        title: "Agreement (Copy)",
        status: "draft",
        version: 1,
      });

      const result = await service.duplicate("c1", {}, "org_1", "user_1");

      expect(prismaMock.contract.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: "p1",
          title: "Agreement (Copy)",
          status: "draft",
          version: 1,
        }),
      });
      expect(result.id).toBe("c2");
    });
  });

  describe("findByClient", () => {
    it("throws ForbiddenException if client is not assigned to project", async () => {
      prismaMock.projectClient.findFirst.mockResolvedValue(null);

      await expect(service.findByClient("p1", "client_unassigned", "org_1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("returns non-draft contracts for assigned client", async () => {
      prismaMock.projectClient.findFirst.mockResolvedValue({ id: "pc1" });
      prismaMock.contract.findMany.mockResolvedValue([
        { id: "c1", title: "Signed Agreement", status: "sent" },
      ]);
      prismaMock.contract.count.mockResolvedValue(1);

      const result = await service.findByClient("p1", "client_1", "org_1");

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("c1");
    });
  });
});
