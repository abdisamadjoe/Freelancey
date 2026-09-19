"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { ContractContent, CONTRACT_TEMPLATES } from "@/shared";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Modal,
  ModalBody,
  ModalHeader,
  StatusBadge,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  TableRowSkeleton,
} from "@/components/ui";
import { ContractPreview } from "./contract-preview";
import { loadContractPdf, saveContractPdf } from "./contract-pdf";
import { FileText, Download, Eye, FileCheck } from "lucide-react";

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

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface PortalContractsSectionProps {
  projectId: string;
}

export function PortalContractsSection({ projectId }: PortalContractsSectionProps) {
  const toast = useToast();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewingContract, setPreviewingContract] = useState<ContractRecord | null>(null);

  const loadContracts = useCallback(() => {
    setLoading(true);
    apiFetch<PaginatedResponse<ContractRecord>>(`/projects/mine/${projectId}/contracts`)
      .then((res) => setContracts(res.data))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load contracts"))
      .finally(() => setLoading(false));
  }, [projectId, toast]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const handleOpenPreview = async (contract: ContractRecord) => {
    setPreviewingContract(contract);
    apiFetch(`/contracts/mine/${contract.id}/track-view`, { method: "POST" }).catch(() => {});
  };

  const handleDownloadPdf = async (contract: ContractRecord) => {
    try {
      const pdf = await loadContractPdf(`/contracts/mine/${contract.id}/pdf`, contract.title);
      saveContractPdf(pdf);
      URL.revokeObjectURL(pdf.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download contract PDF");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <StatusBadge status="sent" label="Awaiting Review" />;
      case "viewed":
        return <StatusBadge status="viewed" label="Reviewed" />;
      case "signed":
        return <StatusBadge status="signed" label="Signed" />;
      default:
        return <StatusBadge status={status} label={status.toUpperCase()} />;
    }
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b border-card-border px-5 py-4">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-icon-tertiary" aria-hidden />
              Project Agreements
            </CardTitle>
            <CardDescription>
              Review and download official contract agreements for your project.
            </CardDescription>
          </div>
        </CardHeader>

        {loading ? (
          <div aria-busy="true">
            <span className="sr-only">Loading agreements...</span>
            {Array.from({ length: 3 }).map((_, index) => (
              <TableRowSkeleton key={index} columns={4} />
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={FileCheck}
            title="No Agreements Issued Yet"
            description="Your service provider will publish project agreements here when ready."
          />
        ) : (
          <TableRoot>
            <TableHeader>
              <TableRow className="bg-background-gray-secondary_alt">
                <TableHead className="text-text-secondary">Agreement</TableHead>
                <TableHead className="text-text-secondary">Status</TableHead>
                <TableHead className="hidden text-text-secondary sm:table-cell">Version</TableHead>
                <TableHead className="hidden text-text-secondary md:table-cell">Issued</TableHead>
                <TableHead className="text-right text-text-secondary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => {
                const tmplObj = CONTRACT_TEMPLATES.find((t) => t.id === contract.template);

                return (
                  <TableRow key={contract.id} className="hover:bg-background-gray-secondary_alt/60">
                    <TableCell className="max-w-72">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {contract.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-text-tertiary">
                        {tmplObj?.name || contract.template}
                      </p>
                    </TableCell>

                    <TableCell>{getStatusBadge(contract.status)}</TableCell>

                    <TableCell className="hidden sm:table-cell">
                      <Badge color="gray" size="sm">
                        v{contract.version}
                      </Badge>
                    </TableCell>

                    <TableCell className="hidden text-sm text-text-secondary md:table-cell">
                      {new Date(contract.createdAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          appearance="outline"
                          size="sm"
                          onClick={() => handleOpenPreview(contract)}
                        >
                          <Eye />
                          View Agreement
                        </Button>

                        <Button size="sm" onClick={() => handleDownloadPdf(contract)}>
                          <Download />
                          Download PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableRoot>
        )}
      </Card>

      {/* Preview Modal */}
      {previewingContract && (
        <Modal
          open
          onClose={() => setPreviewingContract(null)}
          size="xl"
          className="flex flex-col"
        >
          <ModalHeader className="pr-14" title={previewingContract.title}>
            <Button onClick={() => handleDownloadPdf(previewingContract)}>
              <Download />
              Download PDF
            </Button>
          </ModalHeader>
          <ModalBody>
            <ContractPreview
              content={previewingContract.content}
              status={previewingContract.status}
              version={previewingContract.version}
            />
          </ModalBody>
        </Modal>
      )}
    </div>
  );
}
