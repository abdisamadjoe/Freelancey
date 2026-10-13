"use client";

import { PdfModal } from "@/components/app/pdf-modal";
import {
  ActionButton,
  Empty,
  fmtDate,
  FormGrid,
  Loading,
  Modal,
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
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import { track } from "@/lib/track";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface LineItem {
  id?: string;
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
  uploadedFileId?: string | null;
  uploadedFile?: { id: string; filename: string; sizeBytes: number } | null;
  lineItems: LineItem[];
  createdAt: string;
  paidAt?: string | null;
  paidAmount?: number | null;
  stripePaymentIntentId?: string | null;
}

const BLANK_ITEM: LineItem = { description: "", quantity: 1, unitPrice: 0 };

function LineItemsEditor({ items, onChange }: { items: LineItem[]; onChange: (next: LineItem[]) => void }) {
  const update = (i: number, patch: Partial<LineItem>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-12 items-end gap-2">
          <div className="col-span-12 sm:col-span-6">
            <TextInput label={index === 0 ? "Description" : undefined} value={item.description} onChange={(v) => update(index, { description: v })} />
          </div>
          <div className="col-span-4 sm:col-span-2">
            <TextInput label={index === 0 ? "Qty" : undefined} type="number" min={1} value={item.quantity} onChange={(v) => update(index, { quantity: Math.max(1, parseInt(v || "1", 10)) })} />
          </div>
          <div className="col-span-5 sm:col-span-3">
            <TextInput
              label={index === 0 ? "Unit price" : undefined}
              type="number"
              min={0}
              step="0.01"
              value={item.unitPrice ? item.unitPrice / 100 : ""}
              onChange={(v) => update(index, { unitPrice: Math.round(parseFloat(v || "0") * 100) })}
            />
          </div>
          <div className="col-span-3 sm:col-span-1">
            {items.length > 1 && (
              <Button size="sm" variant="danger" appearance="ghost" onPress={() => onChange(items.filter((_, i) => i !== index))}>
                Remove
              </Button>
            )}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button size="sm" appearance="outline" variant="primary" onPress={() => onChange([...items, { ...BLANK_ITEM }])}>
          Add line
        </Button>
        <p className="font-numeric text-lg font-semibold text-text-primary tabular-nums">{money(total)}</p>
      </div>
    </div>
  );
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

  const [showCreate, setShowCreate] = useState(false);
  const [newItems, setNewItems] = useState<LineItem[]>([{ ...BLANK_ITEM }]);
  const [newDueDate, setNewDueDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState<"" | "draft" | "send">("");

  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAmount, setUploadAmount] = useState("");
  const [uploadDueDate, setUploadDueDate] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploading, setUploading] = useState<"" | "draft" | "send">("");

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

  async function markSent(id: string, errorMessage: string): Promise<boolean> {
    try {
      await apiFetch(`/invoices/${id}`, { method: "PUT", body: JSON.stringify({ status: "sent" }) });
      return true;
    } catch {
      toast.error(errorMessage);
      return false;
    }
  }

  async function createInvoice(send: boolean) {
    setCreating(send ? "send" : "draft");
    try {
      const invoice = await apiFetch<{ id: string }>("/invoices", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          dueDate: newDueDate || undefined,
          notes: newNotes || undefined,
          lineItems: newItems.filter((li) => li.description.trim()),
        }),
      });
      let sent = false;
      if (send) sent = await markSent(invoice.id, "Invoice was saved as a draft but could not be sent. You can send it from the invoice list.");
      track("invoice_created");
      setShowCreate(false);
      setNewItems([{ ...BLANK_ITEM }]);
      setNewDueDate("");
      setNewNotes("");
      toast.success(sent ? "Invoice sent" : "Invoice saved as draft");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setCreating("");
    }
  }

  async function uploadInvoice(send: boolean) {
    if (!uploadFile) return;
    setUploading(send ? "send" : "draft");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("projectId", projectId);
      formData.append("amount", String(Math.round(parseFloat(uploadAmount || "0") * 100)));
      if (uploadDueDate) formData.append("dueDate", uploadDueDate);
      if (uploadNotes) formData.append("notes", uploadNotes);
      const invoice = await apiFetch<{ id: string }>("/invoices/upload", { method: "POST", body: formData });
      let sent = false;
      if (send) sent = await markSent(invoice.id, "Invoice was saved as a draft but could not be sent. You can send it from the invoice list.");
      track("invoice_uploaded");
      setShowUpload(false);
      setUploadFile(null);
      setUploadAmount("");
      setUploadDueDate("");
      setUploadNotes("");
      toast.success(sent ? "Invoice sent" : "Invoice saved as draft");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload invoice");
    } finally {
      setUploading("");
    }
  }

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
                <Button size="sm" appearance="outline" variant="primary" onPress={() => setShowUpload(true)}>
                  Upload PDF
                </Button>
                <Button size="sm" variant="primary" onPress={() => setShowCreate(true)}>
                  New invoice
                </Button>
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

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        wide
        title="New invoice"
        footer={
          <>
            <Button appearance="outline" variant="primary" onPress={() => setShowCreate(false)}>
              Cancel
            </Button>
            <ActionButton appearance="outline" variant="primary" loading={creating === "draft"} isDisabled={!newItems.some((i) => i.description.trim())} onPress={() => createInvoice(false)}>
              Save draft
            </ActionButton>
            <ActionButton variant="primary" loading={creating === "send"} isDisabled={!newItems.some((i) => i.description.trim())} onPress={() => createInvoice(true)}>
              Save & send
            </ActionButton>
          </>
        }
      >
        <div className="space-y-4">
          <LineItemsEditor items={newItems} onChange={setNewItems} />
          <TextInput label="Due date" type="date" value={newDueDate} onChange={setNewDueDate} />
          <TextAreaInput label="Notes" rows={2} value={newNotes} onChange={setNewNotes} />
        </div>
      </Modal>

      <Modal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload invoice"
        description="Attach an invoice you made elsewhere (PDF, JPG, PNG or WebP)."
        footer={
          <>
            <Button appearance="outline" variant="primary" onPress={() => setShowUpload(false)}>
              Cancel
            </Button>
            <ActionButton appearance="outline" variant="primary" loading={uploading === "draft"} isDisabled={!uploadFile} onPress={() => uploadInvoice(false)}>
              Save draft
            </ActionButton>
            <ActionButton variant="primary" loading={uploading === "send"} isDisabled={!uploadFile} onPress={() => uploadInvoice(true)}>
              Save & send
            </ActionButton>
          </>
        }
      >
        <div className="space-y-4">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            aria-label="Invoice file"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-text-secondary"
          />
          <TextInput label="Amount" type="number" min={0} step="0.01" value={uploadAmount} onChange={setUploadAmount} />
          <TextInput label="Due date" type="date" value={uploadDueDate} onChange={setUploadDueDate} />
          <TextAreaInput label="Notes" rows={2} value={uploadNotes} onChange={setUploadNotes} />
        </div>
      </Modal>

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
