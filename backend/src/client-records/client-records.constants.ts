export const CLIENT_STAGES = ["lead", "active", "past", "lost"] as const;
export type ClientStage = (typeof CLIENT_STAGES)[number];

/** Sub-status while stage is "lead". Won = stage "active", Lost = stage "lost". */
export const LEAD_STATUSES = ["new", "contacted", "discovery", "qualified", "proposal_sent"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * Where a lead came from. Every source ends up in the same lead system.
 * Older records may hold free-text sources; they stay readable but new writes use this set.
 */
export const LEAD_SOURCES = ["manual", "google_maps", "website_inquiry", "referral", "import", "other"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const CLIENT_PRIORITIES = ["low", "normal", "high"] as const;

/** Manual timeline entries. "system" is written by the app, never accepted from the API. */
export const ACTIVITY_KINDS = ["note", "call", "whatsapp", "email", "meeting"] as const;

export const CLIENT_ACTIVITY_TYPE = "client_activity";
