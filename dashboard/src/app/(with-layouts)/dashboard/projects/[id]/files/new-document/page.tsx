"use client";

import { ActionButton, CheckInput, FormGrid, Page, PageBody, PageHeader, SelectInput, TextInput } from "@/components/app/kit";
import { DOC_TYPES } from "@/components/app/projects/files-section";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/track";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface CreatedDocument {
  id: string;
  requiresSignature?: boolean;
  signatureFields?: unknown[];
}

export default function NewDocumentPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const back = `/dashboard/projects/${projectId}?tab=files`;

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("contract");
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderIntervalDays, setReminderIntervalDays] = useState("3");
  const [busy, setBusy] = useState<"" | "draft" | "send">("");
  const isPdf = file?.type === "application/pdf";
  const ready = Boolean(file) && Boolean(title.trim());

  async function create(send: boolean) {
    if (!file || busy) return;
    setBusy(send ? "send" : "draft");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", projectId);
      fd.append("type", type);
      fd.append("title", title);
      if (requiresSignature) fd.append("requiresSignature", "true");
      if (requiresApproval) fd.append("requiresApproval", "true");
      if (reminderEnabled) {
        fd.append("reminderEnabled", "true");
        fd.append("reminderIntervalDays", reminderIntervalDays);
      }
      const doc = await apiFetch<CreatedDocument>("/documents", { method: "POST", body: fd });
      track("document_uploaded", { type });
      if (send && !(doc.requiresSignature && !doc.signatureFields?.length)) {
        await apiFetch(`/documents/${doc.id}/send`, {
          method: "POST",
          body: JSON.stringify(expiresInDays ? { expiresInDays: parseInt(expiresInDays, 10) } : {}),
        });
      }
      toast.success(send ? "Document sent" : "Document saved as draft");
      // A document that needs a signature continues straight into placing the signature fields.
      router.push(doc.requiresSignature ? `${back}&place=${doc.id}` : back);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload document");
      setBusy("");
    }
  }

  return (
    <Page>
      <PageHeader
        title="New document"
        description="Upload a PDF or image for the client to review."
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
              aria-label="Document file"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title.trim()) setTitle(f.name.replace(/\.[^/.]+$/, ""));
                if (f && f.type !== "application/pdf") setRequiresSignature(false);
              }}
              className="block w-full text-sm text-text-secondary"
            />
            <FormGrid>
              <TextInput label="Title" required value={title} onChange={setTitle} />
              <SelectInput label="Type" value={type} onChange={setType} options={DOC_TYPES} />
            </FormGrid>
            <div className="space-y-2">
              <CheckInput checked={requiresSignature} onChange={setRequiresSignature} disabled={!isPdf} label="Requires a signature (PDF only)" />
              <CheckInput checked={requiresApproval} onChange={setRequiresApproval} label="Requires approval (accept / decline)" />
            </div>
            <FormGrid>
              <SelectInput
                label="Expires after"
                value={expiresInDays}
                onChange={setExpiresInDays}
                options={[
                  { value: "", label: "Never" },
                  { value: "7", label: "7 days" },
                  { value: "14", label: "14 days" },
                  { value: "30", label: "30 days" },
                  { value: "60", label: "60 days" },
                  { value: "90", label: "90 days" },
                ]}
              />
              <div className="space-y-2">
                <CheckInput checked={reminderEnabled} onChange={setReminderEnabled} label="Send reminders" />
                {reminderEnabled && (
                  <SelectInput
                    value={reminderIntervalDays}
                    onChange={setReminderIntervalDays}
                    options={["1", "2", "3", "5", "7"].map((d) => ({ value: d, label: `every ${d} day${d === "1" ? "" : "s"}` }))}
                  />
                )}
              </div>
            </FormGrid>
            <div className="flex flex-wrap justify-end gap-2 border-t border-card-border pt-4">
              <Button appearance="outline" variant="primary" onPress={() => router.push(back)}>
                Cancel
              </Button>
              <ActionButton appearance="outline" variant="primary" loading={busy === "draft"} isDisabled={!ready} onPress={() => create(false)}>
                Save draft
              </ActionButton>
              <ActionButton variant="primary" loading={busy === "send"} isDisabled={!ready} onPress={() => create(true)}>
                Save &amp; send
              </ActionButton>
            </div>
          </div>
        </Card>
      </PageBody>
    </Page>
  );
}
