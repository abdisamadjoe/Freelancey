import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineService } from "./pipeline.service";
import type { PrismaService } from "../prisma/prisma.service";

const ORG = "org-1";

describe("PipelineService", () => {
  let service: PipelineService;
  let db: Record<string, Record<string, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    db = {
      client: {
        groupBy: vi.fn().mockResolvedValue([
          { leadStatus: "new", _count: { _all: 3 } },
          { leadStatus: "qualified", _count: { _all: 2 } },
          { leadStatus: null, _count: { _all: 1 } },
        ]),
        count: vi.fn().mockResolvedValue(4),
      },
      proposal: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "p1",
            title: "Site",
            status: "sent",
            sentAt: new Date(),
            currency: "USD",
            client: { id: "c1", name: "Acme" },
            items: [
              { quantity: 1, unitPriceCents: 1000, optional: false, selected: true },
              { quantity: 1, unitPriceCents: 500, optional: true, selected: false },
            ],
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
      contract: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
      deliverable: { count: vi.fn().mockResolvedValue(2) },
      supportTicket: { count: vi.fn().mockResolvedValue(5) },
    };
    service = new PipelineService(db as unknown as PrismaService);
  });

  it("counts leads per status, treating a missing status as new", async () => {
    const s = await service.summary(ORG);
    expect(s.leadsByStatus).toEqual([
      { status: "new", count: 4 },
      { status: "contacted", count: 0 },
      { status: "discovery", count: 0 },
      { status: "qualified", count: 2 },
      { status: "proposal_sent", count: 0 },
    ]);
    expect(s.totalLeads).toBe(6);
  });

  it("totals awaiting proposals without unselected optional items", async () => {
    const s = await service.summary(ORG);
    expect(s.proposalsAwaiting).toMatchObject({ count: 1 });
    expect(s.proposalsAwaiting.items[0]).toMatchObject({ id: "p1", totalCents: 1000 });
  });

  it("reports deliverables and open tickets", async () => {
    const s = await service.summary(ORG);
    expect(s.deliverables).toEqual({ inReview: 2, changesRequested: 2 });
    expect(s.openTickets).toBe(5);
  });

  it("scopes every query to the workspace", async () => {
    await service.summary(ORG);
    expect(db.client.groupBy.mock.calls[0][0].where.organizationId).toBe(ORG);
    expect(db.proposal.findMany.mock.calls[0][0].where.organizationId).toBe(ORG);
    expect(db.contract.findMany.mock.calls[0][0].where.organizationId).toBe(ORG);
    expect(db.deliverable.count.mock.calls.every((c) => c[0].where.organizationId === ORG)).toBe(true);
    expect(db.supportTicket.count.mock.calls[0][0].where.organizationId).toBe(ORG);
  });
});
