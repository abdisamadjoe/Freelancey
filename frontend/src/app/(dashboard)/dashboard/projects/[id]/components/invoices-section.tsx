"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import {
  Alert,
  Button,
  Card,
  DataToolbar,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  EmptyState,
  Field,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  NativeSelect,
  Pagination,
  Skeleton,
  StatusBadge,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  Textarea,
} from "@/components/ui";
import {
  Plus,
  Trash2,
  Receipt,
  Download,
  Upload,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  Eye,
  X,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { track } from "@/lib/track";
import { downloadFile, downloadCsv } from "@/lib/download";
import { GenerateFromTimeModal } from "./generate-from-time-modal";
import { PdfViewerModal } from "@/components/pdf-viewer-modal";

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

interface InvoiceStats {
  outstandingAmount: number;
  totalInvoices: number;
  paidAmount: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/* Table head tokens, shared with the rest of the app. */
const HEAD_ROW = "bg-background-gray-secondary_alt";
const HEAD_CELL = "text-text-secondary";
/** Lets a `DropdownMenuItem` hold a title + description stack. */
const MENU_ITEM =
  "items-start py-2.5 [&>span:last-child]:min-w-0 [&>span:last-child]:whitespace-normal [&>span:last-child]:overflow-visible [&>span:last-child]:text-left";
/** Dashed drop-zone metric from the template's uploader. */
const DROP_ZONE =
  "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-card-border bg-background-gray-primary px-3.5 py-2.5 text-sm text-text-secondary transition-colors hover:border-input-primary-focus-border hover:bg-background-gray-secondary_alt hover:text-neutral-brand-color focus-within:border-input-primary-focus-border focus-within:ring-4 focus-within:ring-input-primary-focus-border/20";

export function InvoicesSection({
  projectId,
  isArchived,
}: {
  projectId: string;
  isArchived: boolean;
}) {
  const confirm = useConfirm();
  const { success, error: showError } = useToast();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState<boolean>(false);
  const [viewing, setViewing] = useState<{ url: string; invoiceNumber: string } | null>(null);
  const [outstandingAmount, setOutstandingAmount] = useState(0);

  // Create form state
  const [newDueDate, setNewDueDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newLineItems, setNewLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [sending, setSending] = useState(false);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAmount, setUploadAmount] = useState("");
  const [uploadDueDate, setUploadDueDate] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadSavingDraft, setUploadSavingDraft] = useState(false);
  const [uploadSending, setUploadSending] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<LineItem[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      params.set("projectId", projectId);
      if (statusFilter) params.set("status", statusFilter);
      const [res, stats] = await Promise.all([
        apiFetch<PaginatedResponse<InvoiceListItem>>(`/invoices?${params.toString()}`),
        apiFetch<{ outstandingAmount: number }>(`/invoices/stats?projectId=${encodeURIComponent(projectId)}`),
      ]);
      setInvoices(res.data);
      setTotalPages(res.meta.totalPages);
      setOutstandingAmount(stats.outstandingAmount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId, page, statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const hasCreateDirtyState = () =>
    newDueDate !== "" ||
    newNotes !== "" ||
    newLineItems.some((li) => li.description.trim() || li.unitPrice > 0);

  const hasUploadDirtyState = () =>
    uploadFile !== null || uploadAmount !== "" || uploadDueDate !== "" || uploadNotes !== "";

  const handleCloseCreate = async () => {
    if (hasCreateDirtyState()) {
      const ok = await confirm({
        title: "Discard changes?",
        message: "You have unsaved changes. Closing will discard them.",
        confirmLabel: "Discard",
        variant: "danger",
      });
      if (!ok) return;
    }
    setShowCreate(false);
    setNewDueDate("");
    setNewNotes("");
    setNewLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleCloseUpload = async () => {
    if (hasUploadDirtyState()) {
      const ok = await confirm({
        title: "Discard changes?",
        message: "You have unsaved changes. Closing will discard them.",
        confirmLabel: "Discard",
        variant: "danger",
      });
      if (!ok) return;
    }
    setShowUpload(false);
    setUploadFile(null);
    setUploadAmount("");
    setUploadDueDate("");
    setUploadNotes("");
  };

  // Create handlers
  const updateNewLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setNewLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleCreate = async (sendImmediately = false) => {
    if (sendImmediately) setSending(true);
    else setSavingDraft(true);
    try {
      const invoice = await apiFetch<{ id: string }>("/invoices", {
        method: "POST",
        body: JSON.stringify({
          projectId,
          dueDate: newDueDate || undefined,
          notes: newNotes || undefined,
          lineItems: newLineItems.filter((li) => li.description.trim()),
        }),
      });
      let sent = false;
      if (sendImmediately) {
        try {
          await apiFetch(`/invoices/${invoice.id}`, {
            method: "PUT",
            body: JSON.stringify({ status: "sent" }),
          });
          sent = true;
        } catch {
          showError("Invoice was saved as a draft but could not be sent. You can send it from the invoice list.");
        }
      }
      track("invoice_created", { amount: newTotal });
      setShowCreate(false);
      setNewDueDate("");
      setNewNotes("");
      setNewLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      loadInvoices();
      if (!sendImmediately || sent) {
        success(sent ? "Invoice sent to client" : "Invoice saved as draft");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setSending(false);
      setSavingDraft(false);
    }
  };

  const handleUploadInvoice = async (sendImmediately = false) => {
    if (!uploadFile) return;
    if (sendImmediately) setUploadSending(true);
    else setUploadSavingDraft(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("projectId", projectId);
      formData.append("amount", String(Math.round(parseFloat(uploadAmount || "0") * 100)));
      if (uploadDueDate) formData.append("dueDate", uploadDueDate);
      if (uploadNotes) formData.append("notes", uploadNotes);

      const invoice = await apiFetch<{ id: string }>("/invoices/upload", {
        method: "POST",
        body: formData,
      });
      let sent = false;
      if (sendImmediately) {
        try {
          await apiFetch(`/invoices/${invoice.id}`, {
            method: "PUT",
            body: JSON.stringify({ status: "sent" }),
          });
          sent = true;
        } catch {
          showError("Invoice was saved as a draft but could not be sent. You can send it from the invoice list.");
        }
      }
      track("invoice_uploaded");
      setShowUpload(false);
      setUploadFile(null);
      setUploadAmount("");
      setUploadDueDate("");
      setUploadNotes("");
      loadInvoices();
      if (!sendImmediately || sent) {
        success(sent ? "Invoice sent to client" : "Invoice saved as draft");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to upload invoice");
    } finally {
      setUploadSending(false);
      setUploadSavingDraft(false);
    }
  };

  const handleDownloadFile = async (fileId: string, filename: string) => {
    try {
      await downloadFile(fileId, filename);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to download file");
    }
  };

  // Status transition
  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      await apiFetch(`/invoices/${invoiceId}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      loadInvoices();
      success(`Invoice marked as ${newStatus}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  // Edit handlers
  const startEditing = (inv: InvoiceListItem) => {
    setEditingId(inv.id);
    setEditItems(
      inv.lineItems.map((li) => ({
        id: li.id,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
      })),
    );
    setEditNotes(inv.notes || "");
    setEditDueDate(inv.dueDate ? inv.dueDate.split("T")[0] : "");
  };

  const handleSaveEdit = async (invoiceId: string) => {
    setSaving(true);
    try {
      await apiFetch(`/invoices/${invoiceId}`, {
        method: "PUT",
        body: JSON.stringify({
          dueDate: editDueDate || null,
          notes: editNotes,
          lineItems: editItems.filter((li) => li.description.trim()),
        }),
      });
      setEditingId(null);
      loadInvoices();
      success("Invoice updated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update invoice");
    } finally {
      setSaving(false);
    }
  };

  const updateEditItem = (index: number, field: keyof LineItem, value: string | number) => {
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  // Delete
  const handleDelete = async (invoiceId: string) => {
    const ok = await confirm({
      title: "Delete Invoice",
      message: "Delete this invoice? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/invoices/${invoiceId}`, { method: "DELETE" });
      loadInvoices();
      success("Invoice deleted");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete invoice");
    }
  };

  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/invoices/${invoiceId}/pdf`,
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
        `${process.env.NEXT_PUBLIC_API_URL || ""}/api/invoices/${invoiceId}/pdf`,
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

  const newTotal = newLineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  const isCreateSubmitting = savingDraft || sending;
  const isUploadSubmitting = uploadSavingDraft || uploadSending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base leading-6 font-semibold tracking-[-0.2px] text-text-primary">
          <Receipt className="size-4 text-icon-tertiary" aria-hidden />
          Invoices
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {invoices.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              appearance="ghost"
              size="sm"
              onClick={() => downloadCsv("/invoices/export")}
              title="Export invoices as CSV"
            >
              <Download />
              Export
            </Button>
          )}
          {!isArchived && (
            <DropdownMenu
              align="end"
              contentClassName="w-72"
              className="shrink-0"
              trigger={
                <Button type="button" aria-haspopup="menu">
                  <Plus />
                  New Invoice
                  <ChevronDown className="opacity-80" />
                </Button>
              }
            >
              <DropdownMenuItem
                icon={<FileText />}
                className={MENU_ITEM}
                onSelect={() => setShowCreate(true)}
              >
                <span className="block text-sm font-medium text-text-primary">Create new</span>
                <span className="block text-xs text-text-tertiary">Build line items by hand</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<Clock />}
                className={MENU_ITEM}
                onSelect={() => setShowGenerate(true)}
              >
                <span className="block text-sm font-medium text-text-primary">
                  Generate from time
                </span>
                <span className="block text-xs text-text-tertiary">
                  Roll up un-invoiced billable hours
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<Upload />}
                className={MENU_ITEM}
                onSelect={() => setShowUpload(true)}
              >
                <span className="block text-sm font-medium text-text-primary">Upload PDF</span>
                <span className="block text-xs text-text-tertiary">
                  Attach an existing invoice file
                </span>
              </DropdownMenuItem>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Generate from time modal */}
      {showGenerate && (
        <GenerateFromTimeModal
          projectId={projectId}
          onClose={() => setShowGenerate(false)}
          onCreated={() => {
            loadInvoices();
          }}
        />
      )}

      {viewing && (
        <PdfViewerModal
          url={viewing.url}
          title={viewing.invoiceNumber}
          onClose={closeViewer}
        />
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={handleCloseCreate} size="lg">
        <ModalHeader className="pr-12" title="New Invoice" />
        <ModalBody className="space-y-4">
          <Field label="Due Date" htmlFor="new-invoice-due-date">
            <Input
              id="new-invoice-due-date"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
            />
          </Field>

          <div>
            <Label className="mb-2 block">Line Items</Label>
            <div className="space-y-2">
              {newLineItems.map((item, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-lg border-[0.5px] border-card-border bg-card-surface-area p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateNewLineItem(index, "description", e.target.value)}
                      placeholder="Description"
                      aria-label="Description"
                      className="min-w-0 flex-1"
                    />
                    {newLineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        appearance="ghost"
                        size="sm"
                        iconOnly
                        className="shrink-0"
                        title="Remove line item"
                        aria-label="Remove line item"
                        onClick={() => setNewLineItems((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateNewLineItem(index, "quantity", parseInt(e.target.value) || 0)}
                      min={1}
                      placeholder="Qty"
                      aria-label="Quantity"
                      className="w-16 shrink-0"
                    />
                    <div className="relative min-w-0 flex-1">
                      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-text-tertiary">
                        $
                      </span>
                      <Input
                        type="number"
                        value={item.unitPrice / 100 || ""}
                        onChange={(e) =>
                          updateNewLineItem(index, "unitPrice", Math.round(parseFloat(e.target.value || "0") * 100))
                        }
                        step="0.01"
                        min={0}
                        placeholder="0.00"
                        aria-label="Unit price"
                        className="pl-7"
                      />
                    </div>
                    <span className="shrink-0 font-numeric text-sm font-medium text-text-primary tabular-nums">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="primary"
              appearance="ghost"
              size="sm"
              className="mt-2 px-0"
              onClick={() => setNewLineItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }])}
            >
              <Plus />
              Add Line Item
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-background-gray-primary px-4 py-3">
            <span className="text-sm text-text-secondary">Total</span>
            <p className="font-numeric text-2xl font-semibold text-text-primary tabular-nums">{formatCurrency(newTotal)}</p>
          </div>

          <Field label="Notes" htmlFor="new-invoice-notes">
            <Textarea
              id="new-invoice-notes"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={2}
              placeholder="Additional notes..."
              className="resize-none"
            />
          </Field>
        </ModalBody>
        <ModalFooter className="flex-wrap">
          <Button
            type="button"
            appearance="outline"
            onClick={handleCloseCreate}
            disabled={isCreateSubmitting}
          >
            Cancel
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            appearance="outline"
            onClick={() => handleCreate(false)}
            disabled={isCreateSubmitting || newLineItems.every((li) => !li.description.trim())}
          >
            {savingDraft ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            type="button"
            onClick={() => handleCreate(true)}
            disabled={isCreateSubmitting || newLineItems.every((li) => !li.description.trim())}
          >
            {sending ? "Sending..." : "Send to Client"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Upload modal */}
      <Modal open={showUpload} onClose={handleCloseUpload} size="md">
        <ModalHeader className="pr-12" title="Upload Invoice" />
        <ModalBody className="space-y-4">
          <Field label="Invoice File" htmlFor="invoice-upload-file">
            {uploadFile ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-card-border bg-input-background px-3.5 py-2.5">
                <FileText className="size-4 shrink-0 text-icon-tertiary" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                  {uploadFile.name}
                </span>
                <span className="shrink-0 text-xs text-text-tertiary">
                  {formatBytes(uploadFile.size)}
                </span>
                <Button
                  type="button"
                  variant="danger"
                  appearance="ghost"
                  size="xs"
                  iconOnly
                  title="Remove file"
                  aria-label="Remove file"
                  onClick={() => setUploadFile(null)}
                >
                  <X />
                </Button>
              </div>
            ) : (
              <label htmlFor="invoice-upload-file" className={DROP_ZONE}>
                <Upload className="size-4" aria-hidden />
                Choose file
                <input
                  id="invoice-upload-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}
          </Field>

          <Field label="Amount" htmlFor="invoice-upload-amount">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-text-tertiary">
                $
              </span>
              <Input
                id="invoice-upload-amount"
                type="number"
                value={uploadAmount}
                onChange={(e) => setUploadAmount(e.target.value)}
                step="0.01"
                min={0}
                placeholder="0.00"
                className="pl-7"
              />
            </div>
          </Field>

          <Field label="Due Date" htmlFor="invoice-upload-due-date">
            <Input
              id="invoice-upload-due-date"
              type="date"
              value={uploadDueDate}
              onChange={(e) => setUploadDueDate(e.target.value)}
            />
          </Field>

          <Field label="Notes" htmlFor="invoice-upload-notes">
            <Textarea
              id="invoice-upload-notes"
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              rows={2}
              placeholder="Additional notes..."
              className="resize-none"
            />
          </Field>

          {!uploadFile && (
            <p className="text-xs text-text-tertiary">Select a file to continue</p>
          )}
        </ModalBody>
        <ModalFooter className="flex-wrap">
          <Button
            type="button"
            appearance="outline"
            onClick={handleCloseUpload}
            disabled={isUploadSubmitting}
          >
            Cancel
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            appearance="outline"
            onClick={() => handleUploadInvoice(false)}
            disabled={isUploadSubmitting || !uploadFile}
          >
            {uploadSavingDraft ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            type="button"
            onClick={() => handleUploadInvoice(true)}
            disabled={isUploadSubmitting || !uploadFile}
          >
            {uploadSending ? "Sending..." : "Send to Client"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Invoice list */}
      <Card className="overflow-hidden p-0">
        <DataToolbar
          trailing={
            invoices.length > 0 ? (
              <span className="text-xs text-text-tertiary">
                {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
                {outstandingAmount > 0 && ` \u2014 ${formatCurrency(outstandingAmount)} outstanding`}
              </span>
            ) : undefined
          }
        >
          <NativeSelect
            aria-label="Filter invoices by status"
            className="w-full sm:w-44"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </NativeSelect>
        </DataToolbar>

        {loading ? (
          <TableRoot>
            <TableHeader>
              <TableRow className={HEAD_ROW}>
                <TableHead className={cn(HEAD_CELL, "w-full")}>Invoice</TableHead>
                <TableHead className={cn(HEAD_CELL, "text-right")}>Amount</TableHead>
                <TableHead className={HEAD_CELL}>Status</TableHead>
                <TableHead className={cn(HEAD_CELL, "text-right")}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[0, 1].map((row) => (
                <TableRow key={row}>
                  <TableCell>
                    <Skeleton className="h-3.5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-3.5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-3.5 w-24" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableRoot>
        ) : invoices.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={Receipt}
            title="No invoices yet."
            description="Create an invoice, generate one from tracked time, or upload an existing PDF."
          />
        ) : (
          <TableRoot>
            <TableHeader>
              <TableRow className={HEAD_ROW}>
                <TableHead className={cn(HEAD_CELL, "w-full")}>Invoice</TableHead>
                <TableHead className={cn(HEAD_CELL, "text-right")}>Amount</TableHead>
                <TableHead className={HEAD_CELL}>Status</TableHead>
                <TableHead className={cn(HEAD_CELL, "text-right")}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const isUploaded = inv.type === "uploaded";
                const total = isUploaded
                  ? (inv.amount || 0)
                  : inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
                const isExpanded = expandedId === inv.id;
                const isDraft = inv.status === "draft";
                const isEditing = editingId === inv.id;

                return (
                  <Fragment key={inv.id}>
                    {/* Row header */}
                    <TableRow className={cn(isExpanded && "bg-card-surface-area")}>
                      <TableCell className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                          aria-expanded={isExpanded}
                          className="flex w-full items-start gap-3 rounded-md text-left outline-none focus-visible:ring-4 focus-visible:ring-button-outline-focus-ring"
                        >
                          {isExpanded ? (
                            <ChevronDown className="mt-0.5 size-4 shrink-0 text-icon-tertiary" aria-hidden />
                          ) : (
                            <ChevronRight className="mt-0.5 size-4 shrink-0 text-icon-tertiary" aria-hidden />
                          )}
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-text-primary">
                              {inv.invoiceNumber}
                            </span>
                            {inv.dueDate && (
                              <span className="mt-0.5 block text-xs text-text-tertiary">
                                Due {new Date(inv.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="text-right font-numeric font-medium whitespace-nowrap text-text-primary tabular-nums">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          <DropdownMenu
                            align="end"
                            contentClassName="w-44"
                            trigger={
                              <Button
                                type="button"
                                variant="ghost"
                                appearance="ghost"
                                size="sm"
                                iconOnly
                                aria-label="Invoice actions"
                                title="Invoice actions"
                              >
                                <MoreHorizontal />
                              </Button>
                            }
                          >
                            <DropdownMenuItem
                              icon={<Eye />}
                              onSelect={() => handleViewPdf(inv.id, inv.invoiceNumber)}
                            >
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              icon={<Download />}
                              onSelect={() => handleDownloadPdf(inv.id, inv.invoiceNumber)}
                            >
                              PDF
                            </DropdownMenuItem>
                            {isDraft && !isArchived && !isEditing && (
                              <DropdownMenuItem icon={<Pencil />} onSelect={() => startEditing(inv)}>
                                Edit
                              </DropdownMenuItem>
                            )}
                            {!isArchived && inv.status !== "paid" && !inv.stripePaymentIntentId && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  icon={<Trash2 />}
                                  destructive
                                  onSelect={() => handleDelete(inv.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <TableRow className="bg-card-surface-area">
                        <TableCell colSpan={4} className="py-4 font-normal">
                          <div className="space-y-4">
                            {/* Status transitions */}
                            {((isDraft && !isArchived) ||
                              ((inv.status === "sent" || inv.status === "overdue") &&
                                !isArchived &&
                                !inv.stripePaymentIntentId)) && (
                              <div className="flex flex-wrap items-center gap-2">
                                {isDraft && !isArchived && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleStatusChange(inv.id, "sent")}
                                  >
                                    Mark as Sent
                                  </Button>
                                )}
                                {(inv.status === "sent" || inv.status === "overdue") && !isArchived && !inv.stripePaymentIntentId && (
                                  <Button
                                    type="button"
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleStatusChange(inv.id, "paid")}
                                  >
                                    Mark as Paid
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Edit mode */}
                            {isEditing && isDraft ? (
                              <div className="space-y-3">
                                <Field label="Due Date" htmlFor={`edit-invoice-due-date-${inv.id}`}>
                                  <Input
                                    id={`edit-invoice-due-date-${inv.id}`}
                                    type="date"
                                    value={editDueDate}
                                    onChange={(e) => setEditDueDate(e.target.value)}
                                  />
                                </Field>
                                <div className="space-y-2">
                                  {editItems.map((item, index) => (
                                    <div
                                      key={index}
                                      className="space-y-2 rounded-lg border-[0.5px] border-card-border bg-card-background p-3"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="text"
                                          value={item.description}
                                          onChange={(e) => updateEditItem(index, "description", e.target.value)}
                                          placeholder="Description"
                                          aria-label="Description"
                                          className="min-w-0 flex-1"
                                        />
                                        {editItems.length > 1 && (
                                          <Button
                                            type="button"
                                            variant="danger"
                                            appearance="ghost"
                                            size="sm"
                                            iconOnly
                                            className="shrink-0"
                                            title="Remove line item"
                                            aria-label="Remove line item"
                                            onClick={() => setEditItems((prev) => prev.filter((_, i) => i !== index))}
                                          >
                                            <Trash2 />
                                          </Button>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          value={item.quantity}
                                          onChange={(e) => updateEditItem(index, "quantity", parseInt(e.target.value) || 0)}
                                          min={1}
                                          placeholder="Qty"
                                          aria-label="Quantity"
                                          className="w-16 shrink-0"
                                        />
                                        <div className="relative min-w-0 flex-1">
                                          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-text-tertiary">
                                            $
                                          </span>
                                          <Input
                                            type="number"
                                            value={item.unitPrice / 100 || ""}
                                            onChange={(e) =>
                                              updateEditItem(index, "unitPrice", Math.round(parseFloat(e.target.value || "0") * 100))
                                            }
                                            step="0.01"
                                            min={0}
                                            placeholder="0.00"
                                            aria-label="Unit price"
                                            className="pl-7"
                                          />
                                        </div>
                                        <span className="shrink-0 font-numeric text-sm font-medium text-text-primary tabular-nums">
                                          {formatCurrency(item.quantity * item.unitPrice)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  <Button
                                    type="button"
                                    variant="primary"
                                    appearance="ghost"
                                    size="xs"
                                    className="px-0"
                                    onClick={() => setEditItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }])}
                                  >
                                    <Plus />
                                    Add Line Item
                                  </Button>
                                </div>
                                <Field label="Notes" htmlFor={`edit-invoice-notes-${inv.id}`}>
                                  <Textarea
                                    id={`edit-invoice-notes-${inv.id}`}
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    rows={2}
                                    className="resize-none"
                                  />
                                </Field>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleSaveEdit(inv.id)}
                                    disabled={saving}
                                  >
                                    {saving ? "Saving..." : "Save"}
                                  </Button>
                                  <Button
                                    type="button"
                                    appearance="outline"
                                    size="sm"
                                    onClick={() => setEditingId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {isUploaded && inv.uploadedFile ? (
                                  <div className="rounded-lg border-[0.5px] border-card-border bg-card-background p-4">
                                    <p className="text-xs font-medium text-text-tertiary">
                                      Uploaded Invoice
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-text-primary">
                                          {inv.uploadedFile.filename}
                                        </p>
                                        <p className="text-xs text-text-tertiary">
                                          {formatBytes(inv.uploadedFile.sizeBytes)}
                                        </p>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        appearance="ghost"
                                        size="sm"
                                        onClick={() => handleDownloadFile(inv.uploadedFile!.id, inv.uploadedFile!.filename)}
                                      >
                                        <Download />
                                        Download
                                      </Button>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-card-border pt-3">
                                      <span className="text-sm text-text-secondary">Amount</span>
                                      <p className="font-numeric text-2xl font-semibold text-text-primary tabular-nums">
                                        {formatCurrency(total)}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="overflow-hidden rounded-lg border-[0.5px] border-card-border bg-card-background">
                                    <TableRoot>
                                      <TableHeader>
                                        <TableRow className={HEAD_ROW}>
                                          <TableHead className={cn(HEAD_CELL, "w-full")}>Description</TableHead>
                                          <TableHead className={cn(HEAD_CELL, "text-right")}>Qty</TableHead>
                                          <TableHead className={cn(HEAD_CELL, "text-right")}>Price</TableHead>
                                          <TableHead className={cn(HEAD_CELL, "text-right")}>Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {inv.lineItems.map((li, idx) => (
                                          <TableRow key={li.id || idx}>
                                            <TableCell className="text-text-secondary">
                                              {li.description}
                                            </TableCell>
                                            <TableCell className="text-right font-numeric text-text-secondary tabular-nums">
                                              {li.quantity}
                                            </TableCell>
                                            <TableCell className="text-right font-numeric text-text-secondary tabular-nums">
                                              {formatCurrency(li.unitPrice)}
                                            </TableCell>
                                            <TableCell className="text-right font-numeric whitespace-nowrap text-text-primary tabular-nums">
                                              {formatCurrency(li.quantity * li.unitPrice)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </TableRoot>
                                    <div className="flex items-center justify-end gap-4 border-t border-border-primary bg-background-gray-primary px-5 py-3">
                                      <span className="text-sm text-text-secondary">Total</span>
                                      <span className="font-numeric text-sm font-semibold text-text-primary tabular-nums">
                                        {formatCurrency(total)}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {inv.notes && (
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-text-secondary">Notes</p>
                                    <p className="text-sm whitespace-pre-wrap text-text-secondary">
                                      {inv.notes}
                                    </p>
                                  </div>
                                )}

                                {/* Payment details for paid invoices */}
                                {inv.status === "paid" && inv.paidAt && (
                                  <Alert status="success">
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span className="font-medium">
                                        {inv.stripePaymentIntentId ? "Paid via Stripe" : "Marked as paid"}
                                      </span>
                                      <span>{new Date(inv.paidAt).toLocaleDateString()}</span>
                                      {inv.paidAmount != null && inv.paidAmount !== total && (
                                        <span>Received: {formatCurrency(inv.paidAmount)}</span>
                                      )}
                                    </div>
                                  </Alert>
                                )}
                              </>
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
      </Card>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
