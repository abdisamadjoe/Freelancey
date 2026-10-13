"use client";

import { ContractBuilder, type ContractRecord } from "@/components/app/contracts/contract-builder";
import { ErrorNote, Loading, Page, PageBody, PageHeader } from "@/components/app/kit";
import { Card } from "@/components/tailgrids/core/card";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditContractPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const back = `/dashboard/contracts/${id}`;

  useEffect(() => {
    apiFetch<ContractRecord>(`/contracts/${id}`).then(setContract).catch(setLoadError);
  }, [id]);

  return (
    <Page>
      <PageHeader
        title="Edit Contract Agreement"
        actions={
          <Link href={back} className="text-sm font-medium text-neutral-brand-color hover:underline">
            Back to contract
          </Link>
        }
      />
      <PageBody>
        {loadError != null && <ErrorNote error={loadError} />}
        {!contract && loadError == null && <Loading />}
        {contract && (
          <Card className="w-full p-6">
            <ContractBuilder initialContract={contract} onSaved={() => router.push(back)} onCancel={() => router.push(back)} />
          </Card>
        )}
      </PageBody>
    </Page>
  );
}
