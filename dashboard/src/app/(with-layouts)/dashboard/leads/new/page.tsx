"use client";

import {
  ActionButton,
  FormGrid,
  Notice,
  Page,
  PageBody,
  PageHeader,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { apiFetch } from "@/lib/api";
import { LEAD_SOURCES } from "@/lib/leads";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  website: "",
  company: "",
  source: "",
  interestedIn: "",
  budget: "",
  followUp: "",
  notes: "",
};

export default function NewLeadPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  const setField = (key: keyof typeof EMPTY_FORM) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating || !form.name.trim()) return;
    setFormError("");
    if (!form.email.trim() && !form.phone.trim() && !form.whatsapp.trim()) {
      setFormError("Add at least one of email, phone or WhatsApp.");
      return;
    }
    const budget = form.budget.trim() ? Math.round(parseFloat(form.budget) * 100) : undefined;
    if (budget !== undefined && (Number.isNaN(budget) || budget < 0)) {
      setFormError("Budget must be a positive number.");
      return;
    }
    setCreating(true);
    try {
      await apiFetch("/client-records", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          company: form.company.trim() || undefined,
          website: form.website.trim() || undefined,
          source: form.source || "manual",
          interestedIn: form.interestedIn.trim() || undefined,
          estimatedBudgetCents: budget,
          nextFollowUpAt: form.followUp ? new Date(form.followUp).toISOString() : undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      toast.success("Lead added");
      await qc.invalidateQueries({ queryKey: ["api"] });
      router.push("/dashboard/leads");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add lead");
      setCreating(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Add lead"
        description="Name and one way to reach them is enough. Everything else is optional."
        actions={
          <Link href="/dashboard/leads" className="text-sm font-medium text-neutral-brand-color hover:underline">
            Back to leads
          </Link>
        }
      />

      <PageBody>
        <Card className="w-full p-6">
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && <Notice status="error">{formError}</Notice>}
            <TextInput label="Name" required value={form.name} onChange={setField("name")} />
            <FormGrid cols={3}>
              <TextInput label="Email" type="email" value={form.email} onChange={setField("email")} />
              <TextInput label="Phone" value={form.phone} onChange={setField("phone")} />
              <TextInput label="WhatsApp" value={form.whatsapp} onChange={setField("whatsapp")} />
              <TextInput label="Company" value={form.company} onChange={setField("company")} />
              <TextInput label="Website" value={form.website} onChange={setField("website")} />
              <SelectInput
                label="Source"
                value={form.source}
                onChange={setField("source")}
                options={[{ value: "", label: "Manual (default)" }, ...LEAD_SOURCES]}
              />
              <TextInput label="Interested in" value={form.interestedIn} onChange={setField("interestedIn")} />
              <TextInput label="Estimated budget" type="number" min="0" step="0.01" value={form.budget} onChange={setField("budget")} />
              <TextInput label="Follow up on" type="date" value={form.followUp} onChange={setField("followUp")} />
            </FormGrid>
            <TextAreaInput label="Notes" rows={4} value={form.notes} onChange={setField("notes")} />

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button appearance="outline" variant="primary" onPress={() => router.push("/dashboard/leads")}>
                Cancel
              </Button>
              <ActionButton type="submit" variant="primary" appearance="fill" loading={creating} isDisabled={!form.name.trim()}>
                {creating ? "Adding..." : "Add lead"}
              </ActionButton>
            </div>
          </form>
        </Card>
      </PageBody>
    </Page>
  );
}
