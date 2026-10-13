"use client";

import { ActionButton, CheckInput, Page, PageBody, PageHeader, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function InvoiceTimeEntriesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const back = `/dashboard/projects/${projectId}?tab=time`;

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeNonBillable, setIncludeNonBillable] = useState(false);
  const [mergeEntries, setMergeEntries] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = { projectId, includeNonBillable, mergeEntries };
      if (from) body.from = new Date(from).toISOString();
      if (to) body.to = new Date(`${to}T23:59:59`).toISOString();
      await apiFetch<{ invoiceId: string }>("/time-entries/generate-invoice", { method: "POST", body: JSON.stringify(body) });
      toast.success("Draft invoice created from time entries");
      router.push(back);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the invoice");
      setBusy(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Invoice time entries"
        description="Creates a draft invoice from billable time that has not been invoiced yet."
        actions={
          <Link href={back} className="text-sm font-medium text-neutral-brand-color hover:underline">
            Back to project
          </Link>
        }
      />
      <PageBody>
        <Card className="w-full p-6">
          <div className="space-y-4">
            <TextInput label="From" type="date" value={from} onChange={setFrom} />
            <TextInput label="To" type="date" value={to} onChange={setTo} />
            <CheckInput checked={includeNonBillable} onChange={setIncludeNonBillable} label="Include non-billable entries" />
            <CheckInput checked={mergeEntries} onChange={setMergeEntries} label="Merge entries into one line per person" />
            <div className="flex flex-wrap justify-end gap-2 border-t border-card-border pt-4">
              <Button appearance="outline" variant="primary" onPress={() => router.push(back)}>
                Cancel
              </Button>
              <ActionButton variant="primary" loading={busy} onPress={run}>
                Create draft invoice
              </ActionButton>
            </div>
          </div>
        </Card>
      </PageBody>
    </Page>
  );
}
