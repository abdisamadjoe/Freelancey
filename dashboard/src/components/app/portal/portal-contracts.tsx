"use client";

import { ContractPreview } from "@/components/app/contracts/contract-preview";
import { Empty, fmtDate, Loading, Modal, Panel, StatusPill } from "@/components/app/kit";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { loadContractPdf, saveContractPdf } from "@/lib/contract-pdf";
import { CONTRACT_TEMPLATES, type ContractContent } from "@/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
}

const LABEL: Record<string, string> = { sent: "Awaiting Review", viewed: "Reviewed", signed: "Signed" };

export function PortalContractsSection({ projectId }: { projectId: string }) {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState<ContractRecord | null>(null);

  useEffect(() => {
    apiFetch<{ data: ContractRecord[] }>(`/projects/mine/${projectId}/contracts`)
      .then((res) => setContracts(res.data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load contracts"))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <>
      <Panel flush title="Project Agreements" description="Review and download official contract agreements for your project.">
        <div className="border-t border-card-border">
          {loading ? (
            <Loading />
          ) : contracts.length === 0 ? (
            <Empty>No agreements issued yet. Your service provider will publish project agreements here when ready.</Empty>
          ) : (
            <ul className="divide-y divide-card-border">
              {contracts.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                      {c.title} <Badge color="gray">v{c.version}</Badge>
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {CONTRACT_TEMPLATES.find((t) => t.id === c.template)?.name ?? c.template} · {fmtDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={c.status} label={LABEL[c.status] ?? c.status.toUpperCase()} />
                    <Button
                      size="xs"
                      appearance="outline"
                      variant="primary"
                      onPress={() => {
                        setPreviewing(c);
                        apiFetch(`/contracts/mine/${c.id}/track-view`, { method: "POST" }).catch(() => {});
                      }}
                    >
                      View
                    </Button>
                    <Button
                      size="xs"
                      appearance="outline"
                      variant="primary"
                      onPress={async () => {
                        try {
                          const pdf = await loadContractPdf(`/contracts/mine/${c.id}/pdf`, c.title);
                          saveContractPdf(pdf);
                          URL.revokeObjectURL(pdf.url);
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed to download contract PDF");
                        }
                      }}
                    >
                      PDF
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      {previewing && (
        <Modal open wide onClose={() => setPreviewing(null)} title={previewing.title}>
          <ContractPreview content={previewing.content} status={previewing.status} version={previewing.version} />
        </Modal>
      )}
    </>
  );
}
