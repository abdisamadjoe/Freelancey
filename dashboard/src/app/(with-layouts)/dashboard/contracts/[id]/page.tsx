"use client";

import { ContractPreview } from "@/components/app/contracts/contract-preview";
import { ActionButton, CheckInput, ErrorNote, fmtDateTime, Loading, Notice, Page, PageBody, PageHeader, Panel, StatusPill } from "@/components/app/kit";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { loadContractPdf, saveContractPdf } from "@/lib/contract-pdf";
import { CONTRACT_STATUS_LABEL } from "@/lib/contracts";
import type { ContractContent } from "@/shared";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ContractDetail {
  id: string;
  title: string;
  template: string;
  status: string;
  version: number;
  content: ContractContent;
  sentAt: string | null;
  signedAt: string | null;
  signedByName: string | null;
  proposalId: string | null;
  clientRecord: { id: string; name: string; email: string | null; stage: string } | null;
  project: { id: string; name: string } | null;
}

export default function ContractPage() {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [sending, setSending] = useState(false);
  const [emailIt, setEmailIt] = useState(true);
  const [link, setLink] = useState("");

  const load = useCallback(async () => {
    try {
      setContract(await apiFetch<ContractDetail>(`/contracts/${id}`));
    } catch (err) {
      setLoadError(err);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!contract) return;
    setSending(true);
    try {
      const res = await apiFetch<{ link: string; emailed: boolean }>(`/contracts/${contract.id}/send-link`, {
        method: "POST",
        body: JSON.stringify({ email: emailIt && Boolean(contract.clientRecord?.email) }),
      });
      setLink(res.link);
      await load();
      toast.success(res.emailed ? "Contract emailed" : "Contract ready to share");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  if (loadError) {
    return (
      <Page>
        <PageBody>
          <ErrorNote error={loadError} />
          <Link href="/dashboard/leads" className="text-sm text-neutral-brand-color hover:underline">
            Back to leads
          </Link>
        </PageBody>
      </Page>
    );
  }
  if (!contract) return <Loading />;

  const signed = contract.status === "signed";
  const record = contract.clientRecord;
  const sentState = contract.status === "sent" || contract.status === "viewed";

  return (
    <Page>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {contract.title}
            <StatusPill status={contract.status} label={CONTRACT_STATUS_LABEL[contract.status] ?? contract.status} />
          </span>
        }
        description={
          <>
            <Link href={record ? `/dashboard/leads/${record.id}` : "/dashboard/leads"} className="text-neutral-brand-color hover:underline">
              {record?.name ?? "Leads"}
            </Link>{" "}
            · Version {contract.version}
          </>
        }
        actions={
          <>
            <Button
              size="sm"
              appearance="outline"
              variant="primary"
              onPress={async () => {
                try {
                  const pdf = await loadContractPdf(`/contracts/${contract.id}/pdf`, contract.title);
                  saveContractPdf(pdf);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not render the PDF");
                }
              }}
            >
              PDF
            </Button>
            {!signed && contract.status !== "void" && (
              <Link
                href={`/dashboard/contracts/${contract.id}/edit`}
                className={buttonStyles({ size: "sm", appearance: "outline", variant: "primary" })}
              >
                Edit
              </Link>
            )}
          </>
        }
      />

      <PageBody>
        {signed && (
          <Notice status="success">
            Contract signed by {contract.signedByName}
            {contract.signedAt ? ` on ${fmtDateTime(contract.signedAt)}` : ""}.{" "}
            {record && (
              <Link href={`/dashboard/leads/${record.id}`} className="font-medium underline">
                Next step: create the project
              </Link>
            )}
          </Notice>
        )}
        {sentState && <Notice status="info">Editing a sent contract creates a new draft version and the old link stops working.</Notice>}

        {record && !signed && contract.status !== "void" && (
          <Panel>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <ActionButton variant="primary" loading={sending} onPress={send}>
                  {sentState ? "Resend contract" : "Send contract"}
                </ActionButton>
                {record.email ? (
                  <CheckInput checked={emailIt} onChange={setEmailIt} label={`Email it to ${record.email}`} />
                ) : (
                  <span className="text-sm text-text-tertiary">No email on file. You will get a link to share.</span>
                )}
              </div>
              {link && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-card-border p-3">
                  <code className="min-w-0 flex-1 text-xs break-all text-text-primary">{link}</code>
                  <Button
                    size="sm"
                    appearance="outline"
                    variant="primary"
                    onPress={() => navigator.clipboard.writeText(link).then(() => toast.success("Link copied"))}
                  >
                    Copy link
                  </Button>
                </div>
              )}
            </div>
          </Panel>
        )}

        <ContractPreview content={contract.content} status={contract.status.toUpperCase()} version={contract.version} />
      </PageBody>
    </Page>
  );
}
