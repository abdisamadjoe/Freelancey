"use client";

import { ActionButton, Page, PageBody, PageHeader, TextAreaInput, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/track";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function UploadInvoicePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const back = `/dashboard/projects/${projectId}?tab=invoices`;

  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState<"" | "draft" | "send">("");

  async function upload(send: boolean) {
    if (!file || saving) return;
    setSaving(send ? "send" : "draft");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      formData.append("amount", String(Math.round(parseFloat(amount || "0") * 100)));
      if (dueDate) formData.append("dueDate", dueDate);
      if (notes) formData.append("notes", notes);
      const invoice = await apiFetch<{ id: string }>("/invoices/upload", { method: "POST", body: formData });
      let sent = false;
      if (send) {
        try {
          await apiFetch(`/invoices/${invoice.id}`, { method: "PUT", body: JSON.stringify({ status: "sent" }) });
          sent = true;
        } catch {
          toast.error("Invoice was saved as a draft but could not be sent. You can send it from the invoice list.");
        }
      }
      track("invoice_uploaded");
      toast.success(sent ? "Invoice sent" : "Invoice saved as draft");
      router.push(back);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload invoice");
      setSaving("");
    }
  }

  return (
    <Page>
      <PageHeader
        title="Upload invoice"
        description="Attach an invoice you made elsewhere (PDF, JPG, PNG or WebP)."
        actions={
          <Link href={back} className="text-sm font-medium text-neutral-brand-color hover:underline">
            Back to project
          </Link>
        }
      />
      <PageBody>
        <Card className="w-full p-6">
          <div className="space-y-4">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              aria-label="Invoice file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-text-secondary"
            />
            <TextInput label="Amount" type="number" min={0} step="0.01" value={amount} onChange={setAmount} />
            <TextInput label="Due date" type="date" value={dueDate} onChange={setDueDate} />
            <TextAreaInput label="Notes" rows={3} value={notes} onChange={setNotes} />
            <div className="flex flex-wrap justify-end gap-2 border-t border-card-border pt-4">
              <Button appearance="outline" variant="primary" onPress={() => router.push(back)}>
                Cancel
              </Button>
              <ActionButton appearance="outline" variant="primary" loading={saving === "draft"} isDisabled={!file} onPress={() => upload(false)}>
                Save draft
              </ActionButton>
              <ActionButton variant="primary" loading={saving === "send"} isDisabled={!file} onPress={() => upload(true)}>
                Save &amp; send
              </ActionButton>
            </div>
          </div>
        </Card>
      </PageBody>
    </Page>
  );
}
