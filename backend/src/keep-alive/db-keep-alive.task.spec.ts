import { describe, expect, it, vi } from "vitest";
import { DbKeepAliveTask } from "./db-keep-alive.task";

describe("DbKeepAliveTask", () => {
  it("runs SELECT 1", async () => {
    const prisma = { $queryRawUnsafe: vi.fn().mockResolvedValue([{ "?column?": 1 }]) };
    const task = new DbKeepAliveTask(prisma as never);
    await task.ping();
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith("SELECT 1;");
  });

  it("swallows errors", async () => {
    const prisma = { $queryRawUnsafe: vi.fn().mockRejectedValue(new Error("down")) };
    const task = new DbKeepAliveTask(prisma as never);
    await expect(task.ping()).resolves.toBeUndefined();
  });
});
