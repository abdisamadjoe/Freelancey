"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/toast";
import { Pagination } from "@/components/pagination";
import { ChevronRight, Receipt, Download, CreditCard, Eye } from "lucide-react";
import { downloadFile } from "@/lib/download";
import { usePreviewMode } from "@/lib/preview-mode";
import { PdfViewerModal } from "@/components/pdf-viewer-modal";
import { cn } from "@/lib/utils";
import {
  Button,
  Card,
  EmptyState,
  SectionHeading,
  StatusBadge,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  TableRowSkeleton,
} from "@/components/ui";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  status: string;
  type: string;
  amount?: number | null;
  dueDate?: string | null;
  notes?: string | null;
  projectId?: string | null;
  uploadedFileId?: string | null;
  uploadedFile?: { id: string; filename: string; sizeBytes: number } | null;
  lineItems: LineItem[];
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function PortalInvoicesSection({
  projectId,
}: {
  projectId: string;
}) {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<string | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [viewing, setViewing] = useState<{ url: string; invoiceNumber: string } | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const { success, info, error: showError } = useToast();
  const { preview } = usePreviewMode();

  useEffect(() => {
    apiFetch<{ paymentInstructions: string | null; stripeConnectEnabled: boolean }>("/settings/payment-instructions")
      .then((res) => {
        setPaymentInstructions(res.paymentInstructions);
        setStripeEnabled(res.stripeConnectEnabled);
      })
      .catch(console.error);
  }, []);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<PaginatedResponse<InvoiceListItem>>(
        `/invoices/mine?page=${page}&limit=20&projectId=${encodeURIComponent(projectId)}`,
      );
      setInvoices(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, projectId]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Check for payment redirect results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentParam = params.get("payment");
    if (paymentParam === "success") {
      success("Payment successful! The invoice has been marked as paid.");
      loadInvoices(); // Refresh to show updated status
    } else if (paymentParam === "cancelled") {
      info("Payment was not completed. You can try again below.");
    }

    if (paymentParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileDownload = async (fileId: string, filename: string) => {
    try {
      await downloadFile(fileId, filename);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to download file");
    }
  };

  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/invoices/mine/${invoiceId}/pdf`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to download PDF");
    }
  };

  const handleViewPdf = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/invoices/mine/${invoiceId}/pdf`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Could not load PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setViewing({ url, invoiceNumber });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to open invoice");
    }
  };

  const closeViewer = useCallback(() => {
    setViewing((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const handlePayNow = async (e: React.MouseEvent, invoiceId: string) => {
    e.stopPropagation(); // Prevent row expand/collapse
    setPayingInvoiceId(invoiceId);
    try {
      const currentUrl = window.location.href.split("?")[0];
      const res = await apiFetch<{ url: string }>(
        `/payments/checkout/${invoiceId}`,
        {
          method: "POST",
          body: JSON.stringify({
            successUrl: `${currentUrl}?payment=success`,
            cancelUrl: `${currentUrl}?payment=cancelled`,
          }),
        },
      );
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to start payment");
      setPayingInvoiceId(null);
    }
  };

  const isPayable = (status: string) => ["sent", "overdue"].includes(status);

  const payButton = (invoice: InvoiceListItem, size: "xs" | "sm") =>
    stripeEnabled && isPayable(invoice.status) ? (
      <Button
        size={size}
        onClick={(e) => handlePayNow(e, invoice.id)}
        disabled={!!preview || payingInvoiceId === invoice.id}
        title={preview ? "Disabled in preview mode" : undefined}
      >
        <CreditCard aria-hidden />
        {payingInvoiceId === invoice.id
          ? size === "xs"
            ? "..."
            : "Redirecting..."
          : size === "xs"
            ? "Pay"
            : "Pay Now"}
      </Button>
    ) : null;

  return (
    <div className="space-y-4">
      <SectionHeading title="Invoices" />

      <Card className="overflow-hidden p-0">
        {loading ? (
          <div>
            {Array.from({ length: 2 }).map((_, index) => (
              <TableRowSkeleton key={index} columns={5} />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState variant="plain" icon={Receipt} title="No invoices yet." />
        ) : (
          <TableRoot>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-background-gray-secondary_alt text-text-secondary">
                  Invoice
                </TableHead>
                <TableHead className="bg-background-gray-secondary_alt text-right text-text-secondary">
                  Amount
                </TableHead>
                <TableHead className="bg-background-gray-secondary_alt text-text-secondary">
                  Due
                </TableHead>
                <TableHead className="bg-background-gray-secondary_alt text-text-secondary">
                  Status
                </TableHead>
                <TableHead className="bg-background-gray-secondary_alt text-right text-text-secondary">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const total = inv.type === "uploaded"
                  ? (inv.amount || 0)
                  : inv.lineItems.reduce(
                      (s, li) => s + li.quantity * li.unitPrice,
                      0,
                    );
                const isExpanded = expandedId === inv.id;
                const expandedPanelId = `invoice-details-${inv.id}`;

                return (
                  <Fragment key={inv.id}>
                    <TableRow className="hover:bg-background-gray-secondary_alt">
                      <TableCell className="whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                          aria-expanded={isExpanded}
                          aria-controls={expandedPanelId}
                          className="flex items-center gap-2 text-sm font-medium text-text-primary outline-none transition-colors hover:text-neutral-brand-color focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring"
                        >
                          <ChevronRight
                            className={cn(
                              "size-4 shrink-0 text-icon-tertiary transition-transform",
                              isExpanded && "rotate-90",
                            )}
                            aria-hidden
                          />
                          {inv.invoiceNumber}
                        </button>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap font-numeric tabular-nums">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-text-tertiary">
                        {inv.dueDate ? `Due ${new Date(inv.dueDate).toLocaleDateString()}` : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">{payButton(inv, "xs")}</div>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          id={expandedPanelId}
                          className="bg-background-gray-primary"
                        >
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              {inv.dueDate ? (
                                <p className="text-sm text-text-tertiary">
                                  Due: {new Date(inv.dueDate).toLocaleDateString()}
                                </p>
                              ) : <div />}
                              <div className="flex flex-wrap items-center gap-2">
                                {payButton(inv, "sm")}
                                {inv.type === "uploaded" && inv.uploadedFile && (
                                  <Button
                                    appearance="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleFileDownload(
                                        inv.uploadedFile!.id,
                                        inv.uploadedFile!.filename,
                                      )
                                    }
                                  >
                                    <Download aria-hidden />
                                    Download File
                                  </Button>
                                )}
                                {inv.type !== "uploaded" && (
                                  <>
                                    <Button
                                      appearance="outline"
                                      size="sm"
                                      onClick={() => handleViewPdf(inv.id, inv.invoiceNumber)}
                                    >
                                      <Eye aria-hidden />
                                      View
                                    </Button>
                                    <Button
                                      appearance="outline"
                                      size="sm"
                                      onClick={() => handleDownloadPdf(inv.id, inv.invoiceNumber)}
                                    >
                                      <Download aria-hidden />
                                      Download PDF
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>

                            {inv.type === "uploaded" ? (
                              <div className="rounded-lg border-[0.5px] border-card-border bg-card-background p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm text-text-tertiary">Total Amount</span>
                                  <span className="text-2xl leading-8 font-semibold tracking-[-0.3px] text-text-primary font-numeric tabular-nums">
                                    {formatCurrency(total)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="overflow-hidden rounded-lg border-[0.5px] border-card-border bg-card-background">
                                <TableRoot>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="bg-background-gray-secondary_alt text-text-secondary">
                                        Description
                                      </TableHead>
                                      <TableHead className="bg-background-gray-secondary_alt text-right text-text-secondary">
                                        Qty
                                      </TableHead>
                                      <TableHead className="bg-background-gray-secondary_alt text-right text-text-secondary">
                                        Unit Price
                                      </TableHead>
                                      <TableHead className="bg-background-gray-secondary_alt text-right text-text-secondary">
                                        Total
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {inv.lineItems.map((li) => (
                                      <TableRow key={li.id}>
                                        <TableCell className="font-normal text-text-secondary">
                                          {li.description}
                                        </TableCell>
                                        <TableCell className="text-right font-numeric tabular-nums">
                                          {li.quantity}
                                        </TableCell>
                                        <TableCell className="text-right font-numeric tabular-nums">
                                          {formatCurrency(li.unitPrice)}
                                        </TableCell>
                                        <TableCell className="text-right font-numeric tabular-nums">
                                          {formatCurrency(li.quantity * li.unitPrice)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                  <tfoot>
                                    <TableRow className="bg-background-gray-secondary_alt">
                                      <TableCell
                                        colSpan={3}
                                        className="text-right text-text-secondary"
                                      >
                                        Total
                                      </TableCell>
                                      <TableCell className="text-right text-text-primary font-numeric tabular-nums">
                                        {formatCurrency(total)}
                                      </TableCell>
                                    </TableRow>
                                  </tfoot>
                                </TableRoot>
                              </div>
                            )}

                            {inv.notes && (
                              <div>
                                <p className="mb-1 text-xs font-semibold text-text-secondary">Notes</p>
                                <p className="text-sm leading-5 whitespace-pre-wrap text-text-tertiary">
                                  {inv.notes}
                                </p>
                              </div>
                            )}

                            {/* Only show payment instructions for unpaid invoices */}
                            {paymentInstructions && isPayable(inv.status) && (
                              <div>
                                <p className="mb-1 text-xs font-semibold text-text-secondary">
                                  Payment Instructions
                                </p>
                                <p className="text-sm leading-5 whitespace-pre-wrap text-text-tertiary">
                                  {paymentInstructions}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </TableRoot>
        )}

        {!loading && invoices.length > 0 && totalPages > 1 ? (
          <div className="border-t border-card-border px-5 py-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </Card>

      {viewing && (
        <PdfViewerModal
          url={viewing.url}
          title={viewing.invoiceNumber}
          onClose={closeViewer}
        />
      )}
    </div>
  );
}
