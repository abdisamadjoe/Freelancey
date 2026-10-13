-- Project handover checklist the client can read through a secure link.
CREATE TABLE "handover" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "tokenHash" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "handover_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "handover_item" (
    "id" TEXT NOT NULL,
    "handoverId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "linkUrl" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "handover_item_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "handover_projectId_key" ON "handover"("projectId");
CREATE UNIQUE INDEX "handover_tokenHash_key" ON "handover"("tokenHash");
CREATE INDEX "handover_organizationId_idx" ON "handover"("organizationId");
CREATE INDEX "handover_item_handoverId_idx" ON "handover_item"("handoverId");

ALTER TABLE "handover" ADD CONSTRAINT "handover_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "handover_item" ADD CONSTRAINT "handover_item_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "handover"("id") ON DELETE CASCADE ON UPDATE CASCADE;
