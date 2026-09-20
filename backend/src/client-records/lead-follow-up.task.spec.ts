import { describe, expect, it, vi } from "vitest";
import { LeadFollowUpTask } from "./lead-follow-up.task";
import type { PrismaService } from "../prisma/prisma.service";
import type { NotificationsService } from "../notifications/notifications.service";

function build(rows: { organizationId: string; name: string }[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const notifyLeadFollowUps = vi.fn();
  const task = new LeadFollowUpTask(
    { client: { findMany } } as unknown as PrismaService,
    { notifyLeadFollowUps } as unknown as NotificationsService,
  );
  return { task, findMany, notifyLeadFollowUps };
}

describe("LeadFollowUpTask", () => {
  it("only looks at active leads that are due and not archived", async () => {
    const { task, findMany } = build([]);
    const now = new Date("2026-09-21T08:00:00Z");
    await task.sendDigests(now);
    expect(findMany.mock.calls[0][0].where).toEqual({
      stage: "lead",
      archivedAt: null,
      nextFollowUpAt: { lte: now },
    });
  });

  it("sends one digest per workspace, never mixing workspaces", async () => {
    const { task, notifyLeadFollowUps } = build([
      { organizationId: "a", name: "Kim" },
      { organizationId: "b", name: "Bo" },
      { organizationId: "a", name: "Sam" },
    ]);
    await expect(task.sendDigests()).resolves.toBe(2);
    expect(notifyLeadFollowUps).toHaveBeenCalledTimes(2);
    expect(notifyLeadFollowUps).toHaveBeenCalledWith("a", ["Kim", "Sam"], 2);
    expect(notifyLeadFollowUps).toHaveBeenCalledWith("b", ["Bo"], 1);
  });

  it("sends nothing when no follow-ups are due", async () => {
    const { task, notifyLeadFollowUps } = build([]);
    await expect(task.sendDigests()).resolves.toBe(0);
    expect(notifyLeadFollowUps).not.toHaveBeenCalled();
  });
});
