"use client";

import { ActionButton, Page, PageBody, PageHeader, TextAreaInput, TextInput } from "@/components/app/kit";
import { BLANK_ITEM, type LineItem, LineItemsEditor } from "@/components/app/projects/line-items-editor";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/track";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function NewInvoicePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const back = `/dashboard/projects/${projectId}?tab=invoices`;

  const [items, setItems] = useState<LineItem[]>([{ ...BLANK_ITEM }]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState<"" | "draft" | "send">("");
  const hasItems = items.some((i) => i.description.trim());

  async function create(send: boolean) {
    if (saving || !hasItems) return;
    setSaving(send ? "send" : "draft");
    try {
      const invoice = await apiFetch<{ id: string }>("/invoices", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          dueDate: dueDate || undefined,
          notes: notes || undefined,
          lineItems: items.filter((li) => li.description.trim()),
        }),
      });
      let sent = false;
      if (send) {
        try {
          await apiFetch(`/invoices/${invoice.id}`, { method: "PUT", body: JSON.stringify({ status: "sent" }) });
          sent = true;
        } catch {
          toast.error("Invoice was saved as a draft but could not be sent. You can send it from the invoice list.");
        }
      }
      track("invoice_created");
      toast.success(sent ? "Invoice sent" : "Invoice saved as draft");
      router.push(back);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
      setSaving("");
    }
  }

  return (
    <Page>
      <PageHeader
        title="New invoice"
        description="Add line items, a due date and any notes for the client."
        actions={
          <Link href={back} className="text-sm font-medium text-neutral-brand-color hover:underline">
            Back to project
          </Link>
        }
      />
      <PageBody>
        <Card className="w-full p-6">
          <div className="space-y-4">
            <LineItemsEditor items={items} onChange={setItems} />
            <TextInput label="Due date" type="date" value={dueDate} onChange={setDueDate} />
            <TextAreaInput label="Notes" rows={3} value={notes} onChange={setNotes} />
            <div className="flex flex-wrap justify-end gap-2 border-t border-card-border pt-4">
              <Button appearance="outline" variant="primary" onPress={() => router.push(back)}>
                Cancel
              </Button>
              <ActionButton appearance="outline" variant="primary" loading={saving === "draft"} isDisabled={!hasItems} onPress={() => create(false)}>
                Save draft
              </ActionButton>
              <ActionButton variant="primary" loading={saving === "send"} isDisabled={!hasItems} onPress={() => create(true)}>
                Save &amp; send
              </ActionButton>
            </div>
          </div>
        </Card>
      </PageBody>
    </Page>
  );
}
