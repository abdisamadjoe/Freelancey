"use client";

import { PdfModal } from "@/components/app/pdf-modal";
import { ActionButton, Empty, fmtDate, Loading, money, Notice, PagerRow, Panel, StatusPill } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { downloadFile } from "@/lib/download";
import { usePreviewMode } from "@/lib/preview-mode";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  lineItems: { id: string; description: string; quantity: number; unitPrice: number }[];
  createdAt: string;
}

const isPayable = (status: string) => ["sent", "overdue"].includes(status);

export function PortalInvoicesSection({ projectId }: { projectId: string }) {
  const { preview } = usePreviewMode();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ url: string; invoiceNumber: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<{ data: InvoiceListItem[]; meta: { totalPages: number } }>(`/invoices/mine?projectId=${projectId}&page=${page}&limit=10`)
      .then((res) => {
        setInvoices(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load invoices"))
      .finally(() => setLoading(false));
  }, [projectId, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiFetch<{ paymentInstructions: string | null; stripeConnectEnabled: boolean }>("/settings/payment-instructions")
      .then((r) => {
        setInstructions(r.paymentInstructions);
        setStripeEnabled(r.stripeConnectEnabled);
      })
      .catch(() => {});
    const q = new URLSearchParams(window.location.search).get("payment");
    if (q === "success") toast.success("Payment received. Thank you!");
    if (q === "cancelled") toast.info("Payment was cancelled.");
  }, []);

  async function pay(invoiceId: string) {
    setPaying(invoiceId);
    try {
      const here = window.location.href.split("?")[0];
      const res = await apiFetch<{ url: string }>(`/payments/checkout/${invoiceId}`, {
        method: "POST",
        body: JSON.stringify({ successUrl: `${here}?tab=invoices&payment=success`, cancelUrl: `${here}?tab=invoices&payment=cancelled` }),
      });
      if (res.url) window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start payment");
      setPaying(null);
    }
  }

  async function viewPdf(inv: InvoiceListItem) {
    try {
      const { blob } = await apiFetchBlob(`/invoices/mine/${inv.id}/pdf`);
      setViewing({ url: URL.createObjectURL(blob), invoiceNumber: inv.invoiceNumber });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open invoice");
    }
  }

  return (
    <>
      <Panel flush title="Invoices" description="Invoices issued for this project.">
        <div className="border-t border-card-border">
          {loading ? (
            <Loading />
          ) : invoices.length === 0 ? (
            <Empty>No invoices yet.</Empty>
          ) : (
            <ul className="divide-y divide-card-border">
              {invoices.map((inv) => {
                const total = inv.type === "uploaded" ? (inv.amount ?? 0) : inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
                const open = expanded === inv.id;
                return (
                  <li key={inv.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button type="button" className="min-w-0 text-left" onClick={() => setExpanded(open ? null : inv.id)}>
                        <span className="block text-sm font-medium text-text-primary">{inv.invoiceNumber}</span>
                        {inv.dueDate && <span className="block text-xs text-text-tertiary">Due {fmtDate(inv.dueDate)}</span>}
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-numeric text-sm font-medium text-text-primary tabular-nums">{money(total)}</span>
                        <StatusPill status={inv.status} />
                        <Button size="xs" appearance="outline" variant="primary" onPress={() => viewPdf(inv)}>
                          View
                        </Button>
                        {stripeEnabled && isPayable(inv.status) && (
                          <ActionButton size="xs" variant="primary" loading={paying === inv.id} isDisabled={!!preview} onPress={() => pay(inv.id)}>
                            Pay Now
                          </ActionButton>
                        )}
                      </div>
                    </div>
                    {open && (
                      <div className="mt-3 space-y-3 rounded-lg bg-background-gray-secondary_alt p-4">
                        {inv.type === "uploaded" && inv.uploadedFile ? (
                          <Button
                            size="xs"
                            appearance="outline"
                            variant="primary"
                            onPress={() => downloadFile(inv.uploadedFile!.id, inv.uploadedFile!.filename).catch((e) => toast.error(e.message))}
                          >
                            Download {inv.uploadedFile.filename}
                          </Button>
                        ) : (
                          <ul className="divide-y divide-card-border text-sm">
                            {inv.lineItems.map((li) => (
                              <li key={li.id} className="flex justify-between gap-3 py-1.5">
                                <span className="text-text-primary">
                                  {li.description} <span className="text-text-tertiary">× {li.quantity}</span>
                                </span>
                                <span className="font-numeric tabular-nums">{money(li.quantity * li.unitPrice)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {inv.notes && <p className="text-sm whitespace-pre-wrap text-text-secondary">{inv.notes}</p>}
                        {instructions && isPayable(inv.status) && (
                          <Notice status="info">
                            <span className="block font-medium">Payment instructions</span>
                            <span className="block whitespace-pre-wrap">{instructions}</span>
                          </Notice>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="px-5 pb-5">
          <PagerRow page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </Panel>
      {viewing && (
        <PdfModal
          url={viewing.url}
          title={viewing.invoiceNumber}
          onClose={() => {
            URL.revokeObjectURL(viewing.url);
            setViewing(null);
          }}
        />
      )}
    </>
  );
}
