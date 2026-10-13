import { describe, expect, it } from "vitest";
import { getNextStep, type NextStepInput } from "./next-step";

const base: NextStepInput = { stage: "lead", leadStatus: "new", proposals: [], contracts: [], projectCount: 0 };
const step = (over: Partial<NextStepInput>) => getNextStep({ ...base, ...over });

describe("getNextStep", () => {
  it("says nothing for a brand new lead", () => {
    expect(step({})).toBeNull();
  });

  it("points at discovery and then at the proposal", () => {
    expect(step({ leadStatus: "discovery" })?.title).toBe("In discovery");
    expect(step({ leadStatus: "qualified" })?.title).toBe("Qualified");
  });

  it("tracks the proposal through draft, sent and declined", () => {
    expect(step({ proposals: [{ id: "p", status: "draft" }] })?.title).toBe("Proposal in draft");
    expect(step({ proposals: [{ id: "p", status: "viewed" }] })?.title).toBe("Waiting for the proposal answer");
    expect(step({ proposals: [{ id: "p", status: "rejected" }] })?.tone).toBe("warning");
    expect(step({ proposals: [{ id: "p", status: "expired" }] })?.title).toBe("Proposal not accepted");
  });

  it("offers to create the contract once a proposal is accepted", () => {
    const s = step({ proposals: [{ id: "p1", status: "accepted" }] });
    expect(s?.title).toBe("Proposal accepted");
    expect(s?.action).toEqual({ kind: "create_contract", proposalId: "p1", label: "Create contract" });
  });

  it("moves on to the contract: draft, then waiting for the signature", () => {
    const accepted = [{ id: "p1", status: "accepted" }];
    expect(step({ proposals: accepted, contracts: [{ id: "k", status: "draft", projectId: null }] })?.action).toEqual({
      kind: "open_contract",
      contractId: "k",
      label: "Open contract",
    });
    expect(step({ proposals: accepted, contracts: [{ id: "k", status: "sent", projectId: null }] })?.title).toBe("Waiting for the signature");
  });

  it("ignores void contracts", () => {
    const s = step({ proposals: [{ id: "p1", status: "accepted" }], contracts: [{ id: "k", status: "void", projectId: null }] });
    expect(s?.action?.kind).toBe("create_contract");
  });

  it("tells a new client to create the project, and stops once there is one", () => {
    const signed = [{ id: "k", status: "signed", projectId: null }];
    expect(step({ stage: "active", leadStatus: null, contracts: signed })?.title).toBe("Contract signed");
    expect(step({ stage: "active", leadStatus: null, contracts: signed, projectCount: 1 })).toBeNull();
  });

  it("has nothing to say for lost or past records", () => {
    expect(step({ stage: "lost" })).toBeNull();
    expect(step({ stage: "past" })).toBeNull();
  });
});
