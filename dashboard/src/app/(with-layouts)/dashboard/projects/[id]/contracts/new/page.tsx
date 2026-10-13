"use client";

import { ContractBuilder } from "@/components/app/contracts/contract-builder";
import { Page, PageBody, PageHeader } from "@/components/app/kit";
import { Card } from "@/components/tailgrids/core/card";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function NewContractPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const back = `/dashboard/projects/${id}?tab=contracts`;

  return (
    <Page>
      <PageHeader
        title="Create Project Contract"
        description="Start from a template. Project, client, dates and deliverables are filled in for you."
        actions={
          <Link href={back} className="text-sm font-medium text-neutral-brand-color hover:underline">
            Back to project
          </Link>
        }
      />
      <PageBody>
        <Card className="w-full p-6">
          <ContractBuilder projectId={id} onSaved={() => router.push(back)} onCancel={() => router.push(back)} />
        </Card>
      </PageBody>
    </Page>
  );
}
