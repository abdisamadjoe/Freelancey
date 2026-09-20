-- Client onboarding checklist and generic intake forms.
-- CreateTable
CREATE TABLE "onboarding_item" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "linkedType" TEXT,
    "linkedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_template" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_response" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_response_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "onboarding_item_clientId_idx" ON "onboarding_item"("clientId");

-- CreateIndex
CREATE INDEX "onboarding_item_organizationId_idx" ON "onboarding_item"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "form_template_organizationId_key_key" ON "form_template"("organizationId", "key");

-- CreateIndex
CREATE INDEX "form_response_clientId_idx" ON "form_response"("clientId");

-- CreateIndex
CREATE INDEX "form_response_organizationId_idx" ON "form_response"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "form_response_templateId_clientId_key" ON "form_response"("templateId", "clientId");

-- AddForeignKey
ALTER TABLE "onboarding_item" ADD CONSTRAINT "onboarding_item_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_template" ADD CONSTRAINT "form_template_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_response" ADD CONSTRAINT "form_response_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "form_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_response" ADD CONSTRAINT "form_response_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

