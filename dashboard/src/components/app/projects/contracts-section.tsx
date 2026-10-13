"use client";

import { ContractBuilderModal } from "@/components/app/contracts/contract-builder-modal";
import { ContractPreview } from "@/components/app/contracts/contract-preview";
import { PdfModal } from "@/components/app/pdf-modal";
import { ActionButton, Empty, ErrorNote, fmtDate, Loading, Modal, Panel, StatusPill, useConfirm } from "@/components/app/kit";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { type ContractPdf, loadContractPdf, saveContractPdf } from "@/lib/contract-pdf";
import { CONTRACT_STATUS_LABEL } from "@/lib/contracts";
import { CONTRACT_TEMPLATES, type ContractContent } from "@/shared";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ContractVersionRecord {
  id: string;
  version: number;
  createdAt: string;
}

interface ContractRecord {
  id: string;
  projectId: string;
  title: string;
  template: string;
  status: string;
  content: ContractContent;
  version: number;
  createdAt: string;
  updatedAt: string;
  versions?: ContractVersionRecord[];
}

export function ContractsSection({ projectId, isArchived }: { projectId: string; isArchived?: boolean }) {
  const { confirm, dialog } = useConfirm();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<ContractRecord | null>(null);
  const [previewing, setPreviewing] = useState<ContractRecord | null>(null);
  const [versionsFor, setVersionsFor] = useState<ContractRecord | null>(null);
  const [viewing, setViewing] = useState<{ contract: ContractRecord; pdf: ContractPdf } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    apiFetch<{ data: ContractRecord[] }>(`/projects/${projectId}/contracts`)
      .then((res) => setContracts(res.data))
      .catch(setLoadError)
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // PDFs are rendered on demand from the contract data and never stored.
  const fetchPdf = async (contract: ContractRecord, version?: number) => {
    setBusyId(contract.id);
    try {
      return await loadContractPdf(`/contracts/${contract.id}/pdf${version ? `?version=${version}` : ""}`, contract.title);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to render PDF");
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const closeViewer = () => {
    setViewing((prev) => {
      if (prev) URL.revokeObjectURL(prev.pdf.url);
      return null;
    });
  };

  const send = async (contract: ContractRecord) => {
    setSending(true);
    try {
      await apiFetch(`/contracts/${contract.id}/send`, { method: "POST" });
      toast.success("Contract sent to client");
      closeViewer();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send contract");
    } finally {
      setSending(false);
    }
  };

  const act = async (label: string, run: () => Promise<unknown>, ok: string) => {
    try {
      await run();
      toast.success(ok);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${label}`);
    }
  };

  return (
    <>
      {loadError != null && !loading && <ErrorNote error={loadError} onRetry={load} />}

      <Panel
        flush
        title="Project Contracts"
        description="Create, edit, review, and send legal agreements for this project."
        action={
          !isArchived && (
            <Button
              size="sm"
              variant="primary"
              onPress={() => {
                setEditing(null);
                setBuilderOpen(true);
              }}
            >
              Create Contract
            </Button>
          )
        }
      >
        <div className="border-t border-card-border">
          {loading ? (
            <Loading />
          ) : contracts.length === 0 ? (
            <Empty>No contracts created yet. Create one from a professional legal template.</Empty>
          ) : (
            <ul className="divide-y divide-card-border">
              {contracts.map((c) => {
                const tmpl = CONTRACT_TEMPLATES.find((t) => t.id === c.template);
                // "generated" is a legacy status from when PDFs were stored; it means draft.
                const status = c.status === "generated" ? "draft" : c.status;
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                        {c.title}
                        <Badge color="gray">v{c.version}</Badge>
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {tmpl && tmpl.name !== c.title ? `${tmpl.name} · ` : ""}Updated {fmtDate(c.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={status} label={CONTRACT_STATUS_LABEL[status] ?? status} />
                      <Button size="xs" appearance="outline" variant="primary" onPress={() => setPreviewing(c)}>
                        Preview
                      </Button>
                      <ActionButton
                        size="xs"
                        appearance="outline"
                        variant="primary"
                        loading={busyId === c.id}
                        onPress={async () => {
                          const pdf = await fetchPdf(c);
                          if (pdf) setViewing({ contract: c, pdf });
                        }}
                      >
                        PDF
                      </ActionButton>
                      {status === "draft" && !isArchived && (
                        <Button
                          size="xs"
                          appearance="outline"
                          variant="primary"
                          onPress={() => {
                            setEditing(c);
                            setBuilderOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                      {status === "draft" && !isArchived && (
                        <ActionButton
                          size="xs"
                          variant="primary"
                          onPress={async () => {
                            const pdf = await fetchPdf(c);
                            if (pdf) setViewing({ contract: c, pdf });
                          }}
                        >
                          Review & send
                        </ActionButton>
                      )}
                      {(c.versions?.length ?? 0) > 0 && (
                        <Button size="xs" variant="ghost" onPress={() => setVersionsFor(c)}>
                          Versions
                        </Button>
                      )}
                      {!isArchived && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onPress={() => act("duplicate contract", () => apiFetch(`/contracts/${c.id}/duplicate`, { method: "POST" }), "Contract duplicated")}
                        >
                          Duplicate
                        </Button>
                      )}
                      {!isArchived && status !== "void" && status !== "signed" && (
                        <Button
                          size="xs"
                          variant="danger"
                          appearance="ghost"
                          onPress={async () => {
                            const ok = await confirm({
                              title: "Void Contract",
                              message: `Are you sure you want to void "${c.title}"? This cannot be undone.`,
                              confirmLabel: "Void Contract",
                              danger: true,
                            });
                            if (ok) act("void contract", () => apiFetch(`/contracts/${c.id}/void`, { method: "POST" }), "Contract voided");
                          }}
                        >
                          Void
                        </Button>
                      )}
                      {!isArchived && status === "draft" && (
                        <Button
                          size="xs"
                          variant="danger"
                          appearance="ghost"
                          onPress={async () => {
                            const ok = await confirm({
                              title: "Delete Contract",
                              message: `Permanently delete "${c.title}" and its generated PDFs?`,
                              confirmLabel: "Delete",
                              danger: true,
                            });
                            if (ok) act("delete contract", () => apiFetch(`/contracts/${c.id}`, { method: "DELETE" }), "Contract deleted");
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Panel>

      {builderOpen && (
        <ContractBuilderModal
          projectId={projectId}
          initialContract={editing}
          isOpen
          onClose={() => {
            setBuilderOpen(false);
            setEditing(null);
          }}
          onSuccess={load}
        />
      )}

      {previewing && (
        <Modal open wide onClose={() => setPreviewing(null)} title={previewing.title}>
          <ContractPreview content={previewing.content} status={previewing.status} version={previewing.version} />
        </Modal>
      )}

      {viewing && (
        <PdfModal
          url={viewing.pdf.url}
          title={viewing.contract.title}
          onClose={closeViewer}
          actions={
            <>
              <Button size="sm" appearance="outline" variant="primary" onPress={() => saveContractPdf(viewing.pdf)}>
                Download
              </Button>
              {(viewing.contract.status === "draft" || viewing.contract.status === "generated") && !isArchived && (
                <ActionButton size="sm" variant="primary" loading={sending} onPress={() => send(viewing.contract)}>
                  Send to client
                </ActionButton>
              )}
            </>
          }
        />
      )}

      {versionsFor && (
        <Modal open onClose={() => setVersionsFor(null)} title="Versions" description={versionsFor.title}>
          <ul className="divide-y divide-card-border">
            {(versionsFor.versions ?? []).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-text-primary">
                  Version {v.version} <span className="text-text-tertiary">· {fmtDate(v.createdAt)}</span>
                </span>
                <Button
                  size="xs"
                  appearance="outline"
                  variant="primary"
                  onPress={async () => {
                    const pdf = await fetchPdf(versionsFor, v.version);
                    if (pdf) {
                      saveContractPdf(pdf);
                      URL.revokeObjectURL(pdf.url);
                    }
                  }}
                >
                  Download PDF
                </Button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
      {dialog}
    </>
  );
}
