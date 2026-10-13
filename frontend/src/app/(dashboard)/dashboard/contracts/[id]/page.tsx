"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Download, Pencil, Send } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import type { ContractContent } from "@/shared";
import { Alert, Badge, Button, Card, Checkbox, PageHeader } from "@/components/ui";
import { ContractBuilderModal } from "@/components/contracts/contract-builder-modal";
import { ContractPreview } from "@/components/contracts/contract-preview";
import { loadContractPdf, saveContractPdf } from "@/components/contracts/contract-pdf";
import { CONTRACT_STATUS_COLOR, CONTRACT_STATUS_LABEL } from "@/lib/contracts";

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

export default function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  const { success, error: showError } = useToast();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailIt, setEmailIt] = useState(true);
  const [link, setLink] = useState("");

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setContract(await apiFetch<ContractDetail>(`/contracts/${id}`));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load");
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
      success(res.emailed ? "Contract emailed" : "Contract ready to share");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      success("Link copied");
    } catch {
      showError("Copy failed. Select the link and copy it by hand.");
    }
  }

  async function downloadPdf() {
    if (!contract) return;
    try {
      saveContractPdf(await loadContractPdf(`/contracts/${contract.id}/pdf`, contract.title));
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not render the PDF");
    }
  }

  if (loadError) {
    return (
      <div className="space-y-5">
        <Alert status="error">{loadError}</Alert>
        <Link href="/dashboard/leads" className="text-sm text-neutral-brand-color hover:underline">
          Back to leads
        </Link>
      </div>
    );
  }
  if (!contract) return <p className="py-10 text-center text-sm text-text-tertiary">Loading...</p>;

  const signed = contract.status === "signed";
  const record = contract.clientRecord;
  const sentState = contract.status === "sent" || contract.status === "viewed";

  return (
    <div className="space-y-5">
      <Link
        href={record ? `/dashboard/leads/${record.id}` : "/dashboard/leads"}
        className="inline-flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {record?.name ?? "Leads"}
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {contract.title}
            <Badge color={CONTRACT_STATUS_COLOR[contract.status] ?? "gray"}>
              {CONTRACT_STATUS_LABEL[contract.status] ?? contract.status}
            </Badge>
          </span>
        }
        description={`Version ${contract.version}`}
        actions={
          <>
            <Button size="sm" appearance="outline" iconOnly={false} onClick={downloadPdf}>
              <Download />
              <span>PDF</span>
            </Button>
            {!signed && contract.status !== "void" && (
              <Button size="sm" appearance="outline" iconOnly={false} onClick={() => setEditing(true)}>
                <Pencil />
                <span>Edit</span>
              </Button>
            )}
          </>
        }
      />

      {signed && (
        <Alert status="success" title="Contract signed">
          Signed by {contract.signedByName}
          {contract.signedAt ? ` on ${new Date(contract.signedAt).toLocaleString()}` : ""}.{" "}
          {record && (
            <Link href={`/dashboard/leads/${record.id}`} className="font-medium underline">
              Next step: create the project
            </Link>
          )}
        </Alert>
      )}
      {sentState && (
        <Alert status="info">Editing a sent contract creates a new draft version and the old link stops working.</Alert>
      )}

      {record && !signed && contract.status !== "void" && (
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button iconOnly={false} loading={sending} onClick={send}>
              <Send />
              <span>{sentState ? "Resend contract" : "Send contract"}</span>
            </Button>
            {record.email ? (
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <Checkbox checked={emailIt} onChange={() => setEmailIt((v) => !v)} aria-label="Email the link" />
                Email it to {record.email}
              </label>
            ) : (
              <span className="text-sm text-text-tertiary">No email on file. You will get a link to share.</span>
            )}
          </div>
          {link && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-card-border p-3">
              <code className="min-w-0 flex-1 break-all text-xs text-text-primary">{link}</code>
              <Button type="button" size="sm" appearance="outline" iconOnly={false} onClick={copyLink}>
                <Copy />
                <span>Copy link</span>
              </Button>
            </div>
          )}
        </Card>
      )}

      <ContractPreview content={contract.content} status={contract.status.toUpperCase()} version={contract.version} />

      {editing && (
        <ContractBuilderModal
          isOpen
          initialContract={{
            id: contract.id,
            title: contract.title,
            template: contract.template,
            status: contract.status,
            content: contract.content,
            version: contract.version,
          }}
          onClose={() => setEditing(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
