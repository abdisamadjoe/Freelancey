-- Secure accountless links for client onboarding and project brief forms.
CREATE TABLE "form_link" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "kind" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "answers" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_link_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "form_link_tokenHash_key" ON "form_link"("tokenHash");
CREATE INDEX "form_link_clientId_kind_idx" ON "form_link"("clientId", "kind");
CREATE INDEX "form_link_organizationId_idx" ON "form_link"("organizationId");

ALTER TABLE "form_link" ADD CONSTRAINT "form_link_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
