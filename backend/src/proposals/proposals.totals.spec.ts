import { describe, expect, it } from "vitest";
import { proposalTotalCents } from "./proposals.totals";

const item = (quantity: number, unitPriceCents: number, optional = false, selected = true) => ({
  quantity,
  unitPriceCents,
  optional,
  selected,
});

describe("proposalTotalCents", () => {
  it("adds quantity times price for required items", () => {
    expect(proposalTotalCents([item(1, 20000), item(2, 50000)])).toBe(120000);
  });

  it("skips optional items the client has not picked", () => {
    expect(proposalTotalCents([item(1, 20000), item(1, 9900, true, false)])).toBe(20000);
    expect(proposalTotalCents([item(1, 20000), item(1, 9900, true, true)])).toBe(29900);
  });

  it("is zero with no items", () => {
    expect(proposalTotalCents([])).toBe(0);
  });
});
