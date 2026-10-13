"use client";

import { type Column, DataTable, fmtDate, money, Page, PageBody, PageHeader, PagerRow, type Paginated, SelectInput, StatusPill, Toolbar } from "@/components/app/kit";
import { useApi } from "@/lib/query";
import Link from "next/link";
import { useEffect, useState } from "react";

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  status: string;
  type: string;
  amount?: number | null;
  createdAt: string;
  lineItems: { quantity: number; unitPrice: number }[];
  project: { id: string; name: string };
}

const STATUS_OPTIONS = ["draft", "sent", "paid", "overdue", "cancelled"] as const;

const total = (inv: InvoiceListItem) =>
  inv.type === "uploaded" ? inv.amount || 0 : inv.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);

export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (statusFilter) params.set("status", statusFilter);
  const list = useApi<Paginated<InvoiceListItem>>(`/invoices?${params}`);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const columns: Column<InvoiceListItem>[] = [
    {
      key: "invoice",
      header: "Invoice",
      cell: (inv) => (
        <Link href={`/dashboard/projects/${inv.project.id}?tab=invoices`} className="font-medium hover:text-neutral-brand-color hover:underline">
          {inv.invoiceNumber}
        </Link>
      ),
    },
    {
      key: "project",
      header: "Project",
      cell: (inv) => (
        <Link href={`/dashboard/projects/${inv.project.id}`} className="text-text-secondary hover:text-neutral-brand-color hover:underline">
          {inv.project.name}
        </Link>
      ),
    },
    { key: "amount", header: "Amount", className: "text-right", cell: (inv) => <span className="font-numeric tabular-nums">{money(total(inv))}</span> },
    { key: "status", header: "Status", cell: (inv) => <StatusPill status={inv.status} /> },
    { key: "date", header: "Date", className: "text-right", cell: (inv) => <span className="text-text-tertiary">{fmtDate(inv.createdAt)}</span> },
  ];

  return (
    <Page>
      <PageHeader title="Invoices" description="All invoices across your project workspaces." />
      <PageBody>
        <Toolbar>
          <div className="w-full sm:w-48">
            <SelectInput
              value={statusFilter}
              onChange={setStatusFilter}
              options={[{ value: "", label: "All statuses" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]}
            />
          </div>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={list.data?.data}
          rowKey={(i) => i.id}
          loading={list.isLoading}
          empty={list.error ? list.error.message : "No invoices yet. Invoices you create from a project's Invoices tab will show up here."}
        />
        <PagerRow page={page} totalPages={list.data?.meta.totalPages ?? 1} onPageChange={setPage} />
      </PageBody>
    </Page>
  );
}
