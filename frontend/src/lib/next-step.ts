export interface NextStepInput {
  stage: string;
  leadStatus: string | null;
  proposals: { id: string; status: string }[];
  contracts: { id: string; status: string; projectId: string | null }[];
  projectCount: number;
}

export interface NextStep {
  tone: "info" | "success" | "warning";
  title: string;
  text: string;
  /** What the primary button does, if there is one. */
  action?: { kind: "create_contract"; proposalId: string; label: string } | { kind: "open_contract"; contractId: string; label: string };
}

/**
 * The one thing to do next for a lead or client, following the workflow:
 * qualified → proposal → contract → signed → project. Returns null when nothing is pending.
 */
export function getNextStep({ stage, leadStatus, proposals, contracts, projectCount }: NextStepInput): NextStep | null {
  if (stage === "active") {
    const signed = contracts.some((c) => c.status === "signed");
    if (signed && projectCount === 0) {
      return { tone: "success", title: "Contract signed", text: "Next step: create the project. Use the Create project button above." };
    }
    return null;
  }
  if (stage !== "lead") return null;

  const live = contracts.filter((c) => c.status !== "void");
  const draft = live.find((c) => c.status === "draft" || c.status === "generated");
  if (draft) {
    return {
      tone: "info",
      title: "Contract drafted",
      text: "Review it and send it for signature.",
      action: { kind: "open_contract", contractId: draft.id, label: "Open contract" },
    };
  }
  const out = live.find((c) => c.status === "sent" || c.status === "viewed");
  if (out) {
    return {
      tone: "info",
      title: "Waiting for the signature",
      text: out.status === "viewed" ? "The client has opened the contract." : "The contract has been sent.",
      action: { kind: "open_contract", contractId: out.id, label: "Open contract" },
    };
  }

  const accepted = proposals.find((p) => p.status === "accepted");
  if (accepted) {
    return {
      tone: "success",
      title: "Proposal accepted",
      text: "Next step: create the contract. Everything from the proposal carries over.",
      action: { kind: "create_contract", proposalId: accepted.id, label: "Create contract" },
    };
  }

  if (proposals.some((p) => p.status === "sent" || p.status === "viewed")) {
    return { tone: "info", title: "Waiting for the proposal answer", text: "You will be notified when the client responds." };
  }
  const open = proposals.some((p) => p.status === "draft");
  if (open) return { tone: "info", title: "Proposal in draft", text: "Finish and send it from the Proposals card below." };
  if (proposals.length > 0) {
    return {
      tone: "warning",
      title: "Proposal not accepted",
      text: "It was declined or expired. Revise and resend it, or mark the lead as lost.",
    };
  }

  if (leadStatus === "qualified") {
    return { tone: "info", title: "Qualified", text: "Next step: create a proposal from the Proposals card below." };
  }
  if (leadStatus === "discovery") {
    return { tone: "info", title: "In discovery", text: "Write down what they need in the Discovery card, then mark the lead qualified." };
  }
  return null;
}
