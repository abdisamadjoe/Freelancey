-- Deliverables sent to the client for review, and the change requests they raise.
CREATE TABLE "deliverable" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "links" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tokenHash" TEXT,
    "sentAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedByName" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "change_request" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "change_request_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deliverable_tokenHash_key" ON "deliverable"("tokenHash");
CREATE INDEX "deliverable_projectId_idx" ON "deliverable"("projectId");
CREATE INDEX "deliverable_organizationId_idx" ON "deliverable"("organizationId");
CREATE INDEX "change_request_deliverableId_idx" ON "change_request"("deliverableId");
CREATE INDEX "change_request_organizationId_idx" ON "change_request"("organizationId");

ALTER TABLE "deliverable" ADD CONSTRAINT "deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "change_request" ADD CONSTRAINT "change_request_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "deliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
