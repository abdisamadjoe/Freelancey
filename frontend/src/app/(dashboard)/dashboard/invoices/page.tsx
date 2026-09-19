"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Card,
  DataToolbar,
  EmptyState,
  NativeSelect,
  PageHeader,
  Pagination,
  Skeleton,
  StatusBadge,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui";

interface LineItem {
  quantity: number;
  unitPrice: number;
}

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  status: string;
  type: string;
  amount?: number | null;
  createdAt: string;
  lineItems: LineItem[];
  project: { id: string; name: string };
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const HEAD_ROW = "border-b border-border-primary bg-background-gray-secondary_alt";
const HEAD_CELL = "text-xs font-semibold text-text-secondary";

const STATUS_OPTIONS = ["draft", "sent", "paid", "overdue", "cancelled"] as const;

function invoiceTotal(inv: InvoiceListItem): number {
  return inv.type === "uploaded"
    ? inv.amount || 0
    : inv.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
}

/** Placeholder rows used while the invoice list loads. */
function renderSkeletonRows(rows: number) {
  return Array.from({ length: rows }).map((_, index) => (
    <TableRow key={`skeleton-${index}`}>
      <TableCell>
        <Skeleton className="h-3 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-3 w-28" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-3 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="ml-auto h-3 w-20" />
      </TableCell>
    </TableRow>
  ));
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await apiFetch<PaginatedResponse<InvoiceListItem>>(
        `/invoices?${params}`,
      );
      setInvoices(res.data);
      setTotalPages(res.meta.totalPages);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        description="All invoices across your project workspaces."
      />

      <Card className="overflow-hidden p-0">
        <DataToolbar>
          <div className="w-full sm:w-48">
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="h-10 w-full py-0"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </DataToolbar>

        {error ? (
          <div className="p-5">
            <EmptyState icon={Receipt} title="Couldn't load invoices" description={error} />
          </div>
        ) : !loading && invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Invoices you create from a project's Invoices tab will show up here."
          />
        ) : (
          <TableRoot>
            <TableHeader>
              <TableRow className={HEAD_ROW}>
                <TableHead className={cn(HEAD_CELL, "w-full")}>Invoice</TableHead>
                <TableHead className={HEAD_CELL}>Project</TableHead>
                <TableHead className={cn(HEAD_CELL, "text-right")}>Amount</TableHead>
                <TableHead className={HEAD_CELL}>Status</TableHead>
                <TableHead className={cn(HEAD_CELL, "text-right")}>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? renderSkeletonRows(5)
                : invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-text-primary">
                        <Link
                          href={`/dashboard/projects/${inv.project.id}`}
                          className="hover:text-neutral-brand-color hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        <Link
                          href={`/dashboard/projects/${inv.project.id}`}
                          className="hover:text-neutral-brand-color hover:underline"
                        >
                          {inv.project.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-numeric whitespace-nowrap text-text-primary tabular-nums">
                        {formatCurrency(invoiceTotal(inv))}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap text-text-tertiary">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </TableRoot>
        )}
      </Card>

      {!loading && !error && invoices.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
