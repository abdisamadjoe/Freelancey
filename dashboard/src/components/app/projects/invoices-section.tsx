"use client";

import { PdfModal } from "@/components/app/pdf-modal";
import {
  ActionButton,
  Empty,
  fmtDate,
  FormGrid,
  Loading,
  money,
  PagerRow,
  Panel,
  SelectInput,
  StatCard,
  StatGrid,
  StatusPill,
  TextAreaInput,
  TextInput,
  useConfirm,
} from "@/components/app/kit";
import { Button, buttonStyles } from "@/components/tailgrids/core/button";
import { type LineItem, LineItemsEditor } from "@/components/app/projects/line-items-editor";
import Link from "next/link";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
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
  uploadedFileId?: string | null;
  uploadedFile?: { id: string; filename: string; sizeBytes: number } | null;
  lineItems: LineItem[];
  createdAt: string;
  paidAt?: string | null;
  paidAmount?: number | null;
  stripePaymentIntentId?: string | null;
}

export function InvoicesSection({ projectId, isArchived }: { projectId: string; isArchived: boolean }) {
  const { confirm, dialog } = useConfirm();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [outstanding, setOutstanding] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<LineItem[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [viewing, setViewing] = useState<{ url: string; invoiceNumber: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10", projectId });
      if (statusFilter) params.set("status", statusFilter);
      const [res, stats] = await Promise.all([
        apiFetch<{ data: InvoiceListItem[]; meta: { totalPages: number } }>(`/invoices?${params}`),
        apiFetch<{ outstandingAmount: number }>(`/invoices/stats?projectId=${encodeURIComponent(projectId)}`),
      ]);
      setInvoices(res.data);
      setTotalPages(res.meta.totalPages);
      setOutstanding(stats.outstandingAmount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [projectId, page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(
    () => () => {
      if (viewing) URL.revokeObjectURL(viewing.url);
    },
    [viewing],
  );

  async function changeStatus(id: string, status: string) {
    try {
      await apiFetch(`/invoices/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
      toast.success(`Invoice marked ${status}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update invoice");
    }
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      await apiFetch(`/invoices/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          dueDate: editDueDate || null,
          notes: editNotes,
          lineItems: editItems.filter((li) => li.description.trim()).map((li) => ({ description: li.description, quantity: li.quantity, unitPrice: li.unitPrice })),
        }),
      });
      setEditingId(null);
      toast.success("Invoice updated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update invoice");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({ title: "Delete Invoice", message: "Delete this invoice? This cannot be undone.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      await apiFetch(`/invoices/${id}`, { method: "DELETE" });
      toast.success("Invoice deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete invoice");
    }
  }

  async function viewPdf(id: string, invoiceNumber: string) {
    try {
      const { blob } = await apiFetchBlob(`/invoices/${id}/pdf`);
      setViewing({ url: URL.createObjectURL(blob), invoiceNumber });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open invoice");
    }
  }

  async function downloadPdf(id: string, invoiceNumber: string) {
    try {
      const { blob } = await apiFetchBlob(`/invoices/${id}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download PDF");
    }
  }

  return (
    <>
      <StatGrid>
        <StatCard label="Outstanding" value={money(outstanding)} />
      </StatGrid>

      <Panel
        flush
        title="Invoices"
        action={
          <>
            <div className="w-36">
              <SelectInput
                value={statusFilter}
                onChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
                options={[
                  { value: "", label: "All statuses" },
                  { value: "draft", label: "Draft" },
                  { value: "sent", label: "Sent" },
                  { value: "paid", label: "Paid" },
                  { value: "overdue", label: "Overdue" },
                ]}
              />
            </div>
            {!isArchived && (
              <>
                <Link
                  href={`/dashboard/projects/${projectId}/invoices/upload`}
                  className={buttonStyles({ size: "sm", appearance: "outline", variant: "primary" })}
                >
                  Upload PDF
                </Link>
                <Link href={`/dashboard/projects/${projectId}/invoices/new`} className={buttonStyles({ size: "sm" })}>
                  New invoice
                </Link>
              </>
            )}
          </>
        }
      >
        <div className="border-t border-card-border">
          {loading && invoices.length === 0 ? (
            <Loading />
          ) : invoices.length === 0 ? (
            <Empty>No invoices yet. Create an invoice, generate one from tracked time, or upload an existing PDF.</Empty>
          ) : (
            <ul className="divide-y divide-card-border">
              {invoices.map((inv) => {
                const total =
                  inv.type === "uploaded" ? (inv.amount ?? 0) : inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
                const isDraft = inv.status === "draft";
                const isEditing = editingId === inv.id;
                const isExpanded = expandedId === inv.id;
                return (
                  <li key={inv.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button type="button" className="min-w-0 text-left" onClick={() => setExpandedId(isExpanded ? null : inv.id)}>
                        <span className="block text-sm font-medium text-text-primary">{inv.invoiceNumber}</span>
                        {inv.dueDate && <span className="block text-xs text-text-tertiary">Due {fmtDate(inv.dueDate)}</span>}
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-numeric text-sm font-medium text-text-primary tabular-nums">{money(total)}</span>
                        <StatusPill status={inv.status} />
                        <Button size="xs" appearance="outline" variant="primary" onPress={() => viewPdf(inv.id, inv.invoiceNumber)}>
                          View
                        </Button>
                        <Button size="xs" appearance="outline" variant="primary" onPress={() => downloadPdf(inv.id, inv.invoiceNumber)}>
                          PDF
                        </Button>
                        {isDraft && !isArchived && !isEditing && inv.type !== "uploaded" && (
                          <Button
                            size="xs"
                            appearance="outline"
                            variant="primary"
                            onPress={() => {
                              setEditingId(inv.id);
                              setExpandedId(inv.id);
                              setEditItems(inv.lineItems.map((li) => ({ ...li })));
                              setEditNotes(inv.notes ?? "");
                              setEditDueDate(inv.dueDate ? inv.dueDate.slice(0, 10) : "");
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {!isArchived && isDraft && (
                          <Button size="xs" variant="primary" onPress={() => changeStatus(inv.id, "sent")}>
                            Send
                          </Button>
                        )}
                        {!isArchived && inv.status !== "paid" && !inv.stripePaymentIntentId && !isDraft && (
                          <Button size="xs" appearance="outline" variant="success" onPress={() => changeStatus(inv.id, "paid")}>
                            Mark paid
                          </Button>
                        )}
                        {!isArchived && (
                          <Button size="xs" variant="danger" appearance="ghost" onPress={() => remove(inv.id)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 rounded-lg bg-background-gray-secondary_alt p-4">
                        {isEditing ? (
                          <div className="space-y-4">
                            <LineItemsEditor items={editItems} onChange={setEditItems} />
                            <FormGrid>
                              <TextInput label="Due date" type="date" value={editDueDate} onChange={setEditDueDate} />
                            </FormGrid>
                            <TextAreaInput label="Notes" rows={2} value={editNotes} onChange={setEditNotes} />
                            <div className="flex gap-2">
                              <ActionButton size="sm" variant="primary" loading={saving} onPress={() => saveEdit(inv.id)}>
                                Save changes
                              </ActionButton>
                              <Button size="sm" appearance="outline" variant="primary" onPress={() => setEditingId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {inv.type === "uploaded" && inv.uploadedFile ? (
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-text-primary">
                                  {inv.uploadedFile.filename} <span className="text-text-tertiary">({formatBytes(inv.uploadedFile.sizeBytes)})</span>
                                </span>
                                <Button
                                  size="xs"
                                  appearance="outline"
                                  variant="primary"
                                  onPress={() => downloadFile(inv.uploadedFile!.id, inv.uploadedFile!.filename).catch((e) => toast.error(e.message))}
                                >
                                  Download file
                                </Button>
                              </div>
                            ) : (
                              <ul className="divide-y divide-card-border text-sm">
                                {inv.lineItems.map((li, i) => (
                                  <li key={li.id ?? i} className="flex justify-between gap-3 py-1.5">
                                    <span className="text-text-primary">
                                      {li.description} <span className="text-text-tertiary">× {li.quantity}</span>
                                    </span>
                                    <span className="font-numeric tabular-nums text-text-primary">{money(li.quantity * li.unitPrice)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {inv.notes && <p className="text-sm whitespace-pre-wrap text-text-secondary">{inv.notes}</p>}
                            {inv.status === "paid" && inv.paidAt && (
                              <p className="text-xs text-text-tertiary">
                                Paid {fmtDate(inv.paidAt)}
                                {inv.paidAmount != null ? ` · ${money(inv.paidAmount)}` : ""}
                              </p>
                            )}
                          </>
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
      {dialog}
    </>
  );
}
