"use client";

import { Empty, ListRow, ListRows, Loading, Notice, Page, PageBody, PageHeader, PagerRow, type Paginated, Panel, SelectInput, StatusBadge, fmtDate } from "@/components/app/kit";
import { TICKET_PRIORITY_COLOR, TICKET_STATUS_COLOR, TICKET_STATUS_OPTIONS, type TicketRow } from "@/lib/support";
import { useApi } from "@/lib/query";
import { useState } from "react";

export default function SupportInboxPage() {
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (status) params.set("status", status);
  const list = useApi<Paginated<TicketRow>>(`/support-tickets?${params}`);
  const rows = list.data?.data;

  return (
    <Page>
      <PageHeader title="Support" description="Requests from your clients." />
      <PageBody>
        {list.error && <Notice status="error">{list.error.message}</Notice>}
        <div className="w-full sm:w-48">
          <SelectInput
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[{ value: "", label: "All statuses" }, ...TICKET_STATUS_OPTIONS]}
          />
        </div>
        <Panel flush>
          {list.isLoading ? (
            <Loading />
          ) : !rows || rows.length === 0 ? (
            <Empty>
              {status ? "No tickets here." : "No tickets yet. Give a client their support link from their page and requests will show up here."}
            </Empty>
          ) : (
            <ListRows>
              {rows.map((t) => (
                <ListRow key={t.id} href={`/dashboard/support/${t.id}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{t.subject}</p>
                    <p className="truncate text-xs text-text-tertiary">
                      {t.client.company || t.client.name} · {fmtDate(t.createdAt)}
                      {t._count.replies > 0 ? ` · ${t._count.replies} ${t._count.replies === 1 ? "reply" : "replies"}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.priority === "high" && <StatusBadge color={TICKET_PRIORITY_COLOR.high}>High</StatusBadge>}
                    <StatusBadge color={TICKET_STATUS_COLOR[t.status] ?? "gray"}>
                      {TICKET_STATUS_OPTIONS.find((o) => o.value === t.status)?.label ?? t.status}
                    </StatusBadge>
                  </div>
                </ListRow>
              ))}
            </ListRows>
          )}
        </Panel>
        <PagerRow page={page} totalPages={list.data?.meta.totalPages ?? 1} onPageChange={setPage} />
      </PageBody>
    </Page>
  );
}
