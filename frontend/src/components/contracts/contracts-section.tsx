"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";
import { ContractContent, CONTRACT_TEMPLATES } from "@/shared";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  EmptyState,
  Modal,
  ModalBody,
  ModalHeader,
  Sheet,
  StatusBadge,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  TableRowSkeleton,
} from "@/components/ui";
import { ContractBuilderModal } from "./contract-builder-modal";
import { ContractPreview } from "./contract-preview";
import { PdfViewerModal } from "@/components/pdf-viewer-modal";
import { loadContractPdf, saveContractPdf, type ContractPdf } from "./contract-pdf";
import {
  FileText,
  Plus,
  Download,
  Eye,
  Edit,
  Copy,
  Trash2,
  Send,
  Ban,
  FileDown,
  History,
  MoreHorizontal,
} from "lucide-react";

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

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface ContractsSectionProps {
  projectId: string;
  isArchived?: boolean;
}

export function ContractsSection({ projectId, isArchived }: ContractsSectionProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractRecord | null>(null);
  const [previewingContract, setPreviewingContract] = useState<ContractRecord | null>(null);
  const [versionDrawerContract, setVersionDrawerContract] = useState<ContractRecord | null>(null);
  const [viewing, setViewing] = useState<{ contract: ContractRecord; pdf: ContractPdf } | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const loadContracts = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    apiFetch<PaginatedResponse<ContractRecord>>(`/projects/${projectId}/contracts`)
      .then((res) => setContracts(res.data))
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load contracts";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, [projectId, toast]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  // PDFs are rendered on demand from the contract data and never stored.
  const fetchPdf = async (contract: ContractRecord, version?: number) => {
    setPdfLoadingId(contract.id);
    try {
      const qs = version ? `?version=${version}` : "";
      return await loadContractPdf(`/contracts/${contract.id}/pdf${qs}`, contract.title);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to render PDF");
      return null;
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleViewPdf = async (contract: ContractRecord) => {
    const pdf = await fetchPdf(contract);
    if (pdf) setViewing({ contract, pdf });
  };

  const handleDownloadPdf = async (contract: ContractRecord, version?: number) => {
    const pdf = await fetchPdf(contract, version);
    if (!pdf) return;
    saveContractPdf(pdf);
    URL.revokeObjectURL(pdf.url);
  };

  const closeViewer = () => {
    setViewing((prev) => {
      if (prev) URL.revokeObjectURL(prev.pdf.url);
      return null;
    });
  };

  // Send is a review step: the admin sees the exact PDF the client will get, then confirms.
  const handleSendContract = async (contract: ContractRecord) => {
    setSending(true);
    try {
      await apiFetch(`/contracts/${contract.id}/send`, { method: "POST" });
      toast.success("Contract sent to client");
      closeViewer();
      loadContracts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send contract");
    } finally {
      setSending(false);
    }
  };

  const handleVoidContract = async (contract: ContractRecord) => {
    const ok = await confirm({
      title: "Void Contract",
      message: `Are you sure you want to void "${contract.title}"? This cannot be undone.`,
      confirmLabel: "Void Contract",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/contracts/${contract.id}/void`, { method: "POST" });
      toast.success("Contract voided");
      loadContracts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void contract");
    }
  };

  const handleDuplicateContract = async (contract: ContractRecord) => {
    try {
      await apiFetch(`/contracts/${contract.id}/duplicate`, { method: "POST" });
      toast.success("Contract duplicated");
      loadContracts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate contract");
    }
  };

  const handleDeleteContract = async (contract: ContractRecord) => {
    const ok = await confirm({
      title: "Delete Contract",
      message: `Permanently delete "${contract.title}" and its generated PDFs?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/contracts/${contract.id}`, { method: "DELETE" });
      toast.success("Contract deleted");
      loadContracts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete contract");
    }
  };

  const openBuilder = (contract: ContractRecord | null) => {
    setEditingContract(contract);
    setBuilderOpen(true);
  };

  return (
    <div className="space-y-5">
      {loadError && !loading ? (
        <Alert status="error" title="Could not load contracts">
          {loadError}
        </Alert>
      ) : null}

      <Card className="overflow-hidden p-0">
        <CardHeader className="border-b border-card-border px-5 py-4">
          <div className="min-w-0 flex-1 basis-64">
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-icon-tertiary" aria-hidden />
              Project Contracts
            </CardTitle>
            <CardDescription>
              Create, edit, review, and send legal agreements for this project.
            </CardDescription>
          </div>

          {!isArchived && (
            <Button className="whitespace-nowrap" onClick={() => openBuilder(null)}>
              <Plus />
              Create Contract
            </Button>
          )}
        </CardHeader>

        {loading ? (
          <div aria-busy="true">
            <span className="sr-only">Loading contracts...</span>
            {Array.from({ length: 4 }).map((_, index) => (
              <TableRowSkeleton key={index} columns={4} />
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={FileText}
            title="No Contracts Created Yet"
            description="Get started by creating a contract from one of our professional legal templates."
            action={
              !isArchived ? (
                <Button onClick={() => openBuilder(null)}>
                  <Plus />
                  Create First Contract
                </Button>
              ) : undefined
            }
          />
        ) : (
          <TableRoot>
            <TableHeader>
              <TableRow className="bg-background-gray-secondary_alt">
                <TableHead className="text-text-secondary">Contract</TableHead>
                <TableHead className="text-text-secondary">Status</TableHead>
                <TableHead className="hidden text-text-secondary sm:table-cell">Updated</TableHead>
                <TableHead className="text-right text-text-secondary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => {
                const tmplObj = CONTRACT_TEMPLATES.find((t) => t.id === contract.template);
                const isPdfLoading = pdfLoadingId === contract.id;
                // "generated" is a legacy status from when PDFs were stored; it means draft.
                const status = contract.status === "generated" ? "draft" : contract.status;
                const canSend = status === "draft";

                return (
                  <TableRow key={contract.id} className="hover:bg-background-gray-secondary_alt/60">
                    <TableCell className="max-w-72">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-text-primary">
                          {contract.title}
                        </span>
                        <Badge color="gray" size="sm">
                          v{contract.version}
                        </Badge>
                      </div>
                      {tmplObj && tmplObj.name !== contract.title && (
                        <p className="mt-0.5 truncate text-xs text-text-tertiary">
                          {tmplObj.name}
                        </p>
                      )}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>

                    <TableCell className="hidden text-sm text-text-secondary sm:table-cell">
                      {new Date(contract.updatedAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu
                        className="justify-end"
                        contentClassName="min-w-48"
                        trigger={
                          <Button
                            appearance="outline"
                            size="sm"
                            iconOnly
                            title="Contract actions"
                            aria-label={`Actions for ${contract.title}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        }
                      >
                        <DropdownMenuItem
                          icon={<FileText />}
                          disabled={isPdfLoading}
                          onSelect={() => handleViewPdf(contract)}
                        >
                          {isPdfLoading ? "Rendering PDF..." : canSend && !isArchived ? "Review & Send" : "View PDF"}
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          icon={<Download />}
                          disabled={isPdfLoading}
                          onSelect={() => handleDownloadPdf(contract)}
                        >
                          Download PDF
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          icon={<Eye />}
                          onSelect={() => setPreviewingContract(contract)}
                        >
                          Live Preview
                        </DropdownMenuItem>

                        {!isArchived && contract.status !== "void" && (
                          <DropdownMenuItem icon={<Edit />} onSelect={() => openBuilder(contract)}>
                            Edit Contract
                          </DropdownMenuItem>
                        )}

                        {contract.versions && contract.versions.length > 0 && (
                          <DropdownMenuItem
                            icon={<History />}
                            onSelect={() => setVersionDrawerContract(contract)}
                          >
                            Version History
                          </DropdownMenuItem>
                        )}

                        {!isArchived && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              icon={<Copy />}
                              onSelect={() => handleDuplicateContract(contract)}
                            >
                              Duplicate
                            </DropdownMenuItem>
                          </>
                        )}

                        {!isArchived && contract.status !== "void" && (
                          <DropdownMenuItem
                            icon={<Ban />}
                            onSelect={() => handleVoidContract(contract)}
                          >
                            Void Contract
                          </DropdownMenuItem>
                        )}

                        {!isArchived && (
                          <DropdownMenuItem
                            icon={<Trash2 />}
                            destructive
                            onSelect={() => handleDeleteContract(contract)}
                          >
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableRoot>
        )}
      </Card>

      {/* Builder Modal */}
      {builderOpen && (
        <ContractBuilderModal
          projectId={projectId}
          initialContract={editingContract}
          isOpen={builderOpen}
          onClose={() => {
            setBuilderOpen(false);
            setEditingContract(null);
          }}
          onSuccess={loadContracts}
        />
      )}

      {/* Preview Modal */}
      {previewingContract && (
        <Modal
          open
          onClose={() => setPreviewingContract(null)}
          size="xl"
          className="flex flex-col"
        >
          <ModalHeader
            className="pr-14"
            title={`${previewingContract.title} — Live Document Preview`}
          >
            <Button
              onClick={() => {
                const c = previewingContract;
                setPreviewingContract(null);
                handleViewPdf(c);
              }}
            >
              <FileDown />
              Open PDF
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

      {/* PDF viewer (rendered on demand) */}
      {viewing && (
        <PdfViewerModal
          url={viewing.pdf.url}
          title={`${viewing.contract.title} — v${viewing.contract.version}`}
          onClose={closeViewer}
          actions={
            <>
              <Button appearance="outline" onClick={() => saveContractPdf(viewing.pdf)}>
                <Download />
                Download
              </Button>
              {!isArchived &&
                (viewing.contract.status === "draft" || viewing.contract.status === "generated") && (
                  <Button disabled={sending} onClick={() => handleSendContract(viewing.contract)}>
                    <Send />
                    {sending ? "Sending..." : "Send to Client"}
                  </Button>
                )}
            </>
          }
        />
      )}

      {/* Version History Drawer */}
      <Sheet
        open={!!versionDrawerContract}
        onClose={() => setVersionDrawerContract(null)}
        side="right"
        title="Version History"
        className="w-full max-w-md"
      >
        {versionDrawerContract ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b border-card-border px-6 py-5 pr-14">
              <History className="size-4 text-icon-tertiary" aria-hidden />
              <h2 className="text-base leading-6 font-semibold tracking-[-0.2px] text-text-primary">
                Version History
              </h2>
            </div>

            <p className="px-6 pt-4 text-sm leading-5 text-text-tertiary">
              Each version sent for &ldquo;{versionDrawerContract.title}&rdquo; is kept, and its
              PDF is rebuilt from the saved content when you download it.
            </p>

            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
              {(versionDrawerContract.versions || []).map((ver) => (
                <Card key={ver.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">Version {ver.version}</p>
                    <p className="mt-0.5 text-xs text-text-tertiary">
                      Sent {new Date(ver.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    appearance="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={pdfLoadingId === versionDrawerContract.id}
                    onClick={() => handleDownloadPdf(versionDrawerContract, ver.version)}
                  >
                    <Download />
                    PDF
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
