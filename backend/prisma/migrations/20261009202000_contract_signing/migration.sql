-- Contracts can exist before a project, belong to a lead/client record, and be signed through a secure link.
ALTER TABLE "contract" ALTER COLUMN "projectId" DROP NOT NULL;

ALTER TABLE "contract"
  ADD COLUMN "clientRecordId" TEXT,
  ADD COLUMN "proposalId" TEXT,
  ADD COLUMN "tokenHash" TEXT,
  ADD COLUMN "sentAt" TIMESTAMP(3),
  ADD COLUMN "viewedAt" TIMESTAMP(3),
  ADD COLUMN "signedAt" TIMESTAMP(3),
  ADD COLUMN "signedByName" TEXT,
  ADD COLUMN "signedIp" TEXT,
  ADD COLUMN "signedUserAgent" TEXT;

CREATE UNIQUE INDEX "contract_tokenHash_key" ON "contract"("tokenHash");
CREATE INDEX "contract_clientRecordId_idx" ON "contract"("clientRecordId");

ALTER TABLE "contract" ADD CONSTRAINT "contract_clientRecordId_fkey" FOREIGN KEY ("clientRecordId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
