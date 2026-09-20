-- Client relationship records (leads and clients), nullable links, generalised activity log.
-- AlterTable
ALTER TABLE "project" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "activity_log" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "kind" TEXT,
ADD COLUMN     "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "projectId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'lead',
    "leadStatus" TEXT DEFAULT 'new',
    "source" TEXT,
    "interestedIn" TEXT,
    "estimatedBudgetCents" INTEGER,
    "priority" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "notes" TEXT,
    "ownerId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contact" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_organizationId_stage_idx" ON "client"("organizationId", "stage");

-- CreateIndex
CREATE INDEX "client_organizationId_nextFollowUpAt_idx" ON "client"("organizationId", "nextFollowUpAt");

-- CreateIndex
CREATE INDEX "client_contact_userId_idx" ON "client_contact"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "client_contact_clientId_userId_key" ON "client_contact"("clientId", "userId");

-- CreateIndex
CREATE INDEX "project_clientId_idx" ON "project"("clientId");

-- CreateIndex
CREATE INDEX "invoice_clientId_idx" ON "invoice"("clientId");

-- CreateIndex
CREATE INDEX "activity_log_clientId_occurredAt_idx" ON "activity_log"("clientId", "occurredAt");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contact" ADD CONSTRAINT "client_contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

