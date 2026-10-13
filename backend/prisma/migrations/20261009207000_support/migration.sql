-- Support tickets raised by clients through a private link, and the replies on them.
ALTER TABLE "client" ADD COLUMN "supportTokenHash" TEXT;
CREATE UNIQUE INDEX "client_supportTokenHash_key" ON "client"("supportTokenHash");

CREATE TABLE "support_ticket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "source" TEXT NOT NULL DEFAULT 'public',
    "submittedByName" TEXT,
    "submittedByEmail" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ticket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_reply" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorKind" TEXT NOT NULL,
    "authorName" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_reply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_ticket_organizationId_status_idx" ON "support_ticket"("organizationId", "status");
CREATE INDEX "support_ticket_clientId_idx" ON "support_ticket"("clientId");
CREATE INDEX "support_ticket_projectId_idx" ON "support_ticket"("projectId");
CREATE INDEX "support_reply_ticketId_idx" ON "support_reply"("ticketId");

ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_reply" ADD CONSTRAINT "support_reply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
