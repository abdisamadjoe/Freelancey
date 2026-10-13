"use client";

import { ActionButton, ErrorNote, FormGrid, Loading, Page, PageBody, PageHeader, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { apiFetch } from "@/lib/api";
import type { ContractSummary } from "@/lib/contracts";
import type { ClientRecord } from "@/lib/leads";
import type { ContractContent } from "@/shared";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const BLANK = { name: "", startDate: "", endDate: "", budget: "", projectType: "", contractId: "" };

export default function CreateProjectFromLeadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const back = `/dashboard/leads/${id}`;

  const [record, setRecord] = useState<ClientRecord | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [form, setForm] = useState(BLANK);
  const [creating, setCreating] = useState(false);

  // Pre-fill from the signed contract, so nothing is typed twice.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rec = await apiFetch<ClientRecord>(`/client-records/${id}`);
        if (cancelled) return;
        setRecord(rec);
        const base = { ...BLANK, name: `${rec.company || rec.name} project` };
        setForm(base);
        const contracts = await apiFetch<ContractSummary[]>(`/client-records/${id}/contracts`).catch(() => []);
        const signed = contracts.find((c) => c.status === "signed" && !c.projectId);
        if (!signed) return;
        const [contract, proposal] = await Promise.all([
          apiFetch<{ content: ContractContent }>(`/contracts/${signed.id}`),
          signed.proposalId ? apiFetch<{ title: string }>(`/proposals/${signed.proposalId}`).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const total = contract.content.payment?.totalAmountCents;
        setForm({
          name: proposal?.title ?? base.name,
          startDate: contract.content.agreement?.startDate?.slice(0, 10) ?? "",
          endDate: contract.content.agreement?.endDate?.slice(0, 10) ?? "",
          budget: total ? String(total / 100) : "",
          projectType: "Website",
          contractId: signed.id,
        });
      } catch (err) {
        if (!cancelled) setLoadError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const set = (key: keyof typeof BLANK) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (creating || !form.name.trim()) return;
    setCreating(true);
    try {
      const project = await apiFetch<{ id: string }>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          clientId: id,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          budgetCents: form.budget.trim() ? Math.round(parseFloat(form.budget) * 100) : undefined,
          projectType: form.projectType.trim() || undefined,
          contractId: form.contractId || undefined,
        }),
      });
      toast.success("Project created");
      router.push(`/dashboard/projects/${project.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the project");
      setCreating(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Create project"
        description="Their portal login, if they have one, gets access to it automatically."
        actions={
          <Link href={back} className="text-sm font-medium text-neutral-brand-color hover:underline">
            Back to {record?.name ?? "lead"}
          </Link>
        }
      />
      <PageBody>
        {loadError != null && <ErrorNote error={loadError} />}
        {!record && loadError == null && <Loading />}
        {record && (
          <Card className="w-full p-6">
            <form onSubmit={create} className="space-y-4">
              <TextInput label="Project name" required value={form.name} onChange={set("name")} />
              <FormGrid>
                <TextInput label="Start date" type="date" value={form.startDate} onChange={set("startDate")} />
                <TextInput label="Deadline" type="date" value={form.endDate} onChange={set("endDate")} />
                <TextInput label="Budget" type="number" min="0" step="0.01" value={form.budget} onChange={set("budget")} />
                <TextInput label="Project type" placeholder="e.g. Website" value={form.projectType} onChange={set("projectType")} />
              </FormGrid>
              <div className="flex flex-wrap justify-end gap-2 border-t border-card-border pt-4">
                <Button appearance="outline" variant="primary" onPress={() => router.push(back)}>
                  Cancel
                </Button>
                <ActionButton type="submit" variant="primary" loading={creating} isDisabled={!form.name.trim()}>
                  Create project
                </ActionButton>
              </div>
            </form>
          </Card>
        )}
      </PageBody>
    </Page>
  );
}
