-- Proposals sent to leads, with line items and a secure public link.
CREATE TABLE "proposal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope" TEXT,
    "deliverables" TEXT,
    "timeline" TEXT,
    "paymentTerms" TEXT,
    "revisionLimit" INTEGER,
    "validUntil" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tokenHash" TEXT,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "acceptedByName" TEXT,
    "rejectionReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "proposal_line_item" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "selected" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "proposal_line_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "proposal_tokenHash_key" ON "proposal"("tokenHash");
CREATE INDEX "proposal_organizationId_status_idx" ON "proposal"("organizationId", "status");
CREATE INDEX "proposal_clientId_idx" ON "proposal"("clientId");
CREATE INDEX "proposal_line_item_proposalId_idx" ON "proposal_line_item"("proposalId");

ALTER TABLE "proposal" ADD CONSTRAINT "proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposal_line_item" ADD CONSTRAINT "proposal_line_item_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
