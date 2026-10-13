"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Alert, Badge, Card, EmptyState, NativeSelect, PageHeader } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { TICKET_PRIORITY_COLOR, TICKET_STATUS_COLOR, TICKET_STATUS_OPTIONS, type TicketRow } from "@/lib/support";

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export default function SupportInboxPage() {
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TicketRow[] | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) params.set("status", status);
      const res = await apiFetch<Paginated<TicketRow>>(`/support-tickets?${params}`);
      setRows(res.data);
      setTotalPages(res.meta.totalPages);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
      setRows([]);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <PageHeader title="Support" description="Requests from your clients." />
      {error && <Alert status="error">{error}</Alert>}
      <Card>
        <div className="flex items-center gap-3 p-4">
          <NativeSelect
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="h-10 w-44 py-0"
          >
            <option value="">All statuses</option>
            {TICKET_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        {rows === null ? (
          <p className="px-5 py-10 text-center text-sm text-text-tertiary">Loading...</p>
        ) : rows.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={<LifeBuoy className="size-5" aria-hidden />}
            title={status ? "No tickets here" : "No tickets yet"}
            description="Give a client their support link from their page and requests will show up here."
          />
        ) : (
          <ul className="divide-y divide-card-border border-t border-card-border">
            {rows.map((t) => (
              <li key={t.id}>
                <Link href={`/dashboard/support/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-background-gray-secondary_alt_2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{t.subject}</p>
                    <p className="truncate text-xs text-text-tertiary">
                      {t.client.company || t.client.name} · {new Date(t.createdAt).toLocaleDateString()}
                      {t._count.replies > 0 ? ` · ${t._count.replies} ${t._count.replies === 1 ? "reply" : "replies"}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.priority === "high" && <Badge color={TICKET_PRIORITY_COLOR.high}>High</Badge>}
                    <Badge color={TICKET_STATUS_COLOR[t.status] ?? "gray"}>
                      {TICKET_STATUS_OPTIONS.find((o) => o.value === t.status)?.label ?? t.status}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
    </div>
  );
}
