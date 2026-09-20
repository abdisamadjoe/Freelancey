export const CLIENT_STAGES = ["lead", "active", "past", "lost"] as const;
export type ClientStage = (typeof CLIENT_STAGES)[number];

/** Sub-status while stage is "lead". Won = stage "active", Lost = stage "lost". */
export const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal_sent"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CLIENT_PRIORITIES = ["low", "normal", "high"] as const;

/** Manual timeline entries. "system" is written by the app, never accepted from the API. */
export const ACTIVITY_KINDS = ["note", "call", "whatsapp", "email", "meeting"] as const;

export const CLIENT_ACTIVITY_TYPE = "client_activity";
