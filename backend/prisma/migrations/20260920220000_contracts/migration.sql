-- Contracts were added to schema.prisma after the baseline migration.
-- Idempotent: databases created with `prisma db push` already have these tables.

CREATE TABLE IF NOT EXISTS "contract" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT 'custom',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "pdfKey" TEXT,
    "pdfFileName" TEXT,
    "pdfSize" INTEGER,
    "generatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "contract_version" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "pdfKey" TEXT,
    "pdfFileName" TEXT,
    "pdfSize" INTEGER,
    "generatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_version_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "contract_projectId_idx" ON "contract"("projectId");

CREATE INDEX IF NOT EXISTS "contract_organizationId_idx" ON "contract"("organizationId");

CREATE INDEX IF NOT EXISTS "contract_clientId_idx" ON "contract"("clientId");

CREATE INDEX IF NOT EXISTS "contract_version_contractId_idx" ON "contract_version"("contractId");

CREATE UNIQUE INDEX IF NOT EXISTS "contract_version_contractId_version_key" ON "contract_version"("contractId", "version");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_projectId_fkey') THEN
    ALTER TABLE "contract" ADD CONSTRAINT "contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_version_contractId_fkey') THEN
    ALTER TABLE "contract_version" ADD CONSTRAINT "contract_version_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
