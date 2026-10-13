export const PROPOSAL_STATUSES = ["draft", "sent", "viewed", "accepted", "rejected", "expired"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** A client may still answer a proposal in these states. */
export const OPEN_STATUSES: readonly string[] = ["sent", "viewed"];

/** Accepted proposals are a record of agreement and can no longer be edited. */
export const LOCKED_STATUSES: readonly string[] = ["accepted"];
