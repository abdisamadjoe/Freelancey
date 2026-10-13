"use client";

import { PortalOnboardingCard } from "@/components/app/portal/onboarding-card";
import { type Column, DataTable, Notice, Page, PageBody, PageHeader, PagerRow, type Paginated, SearchBox, StatusPill } from "@/components/app/kit";
import { useDebounce } from "@/hooks/use-debounce";
import { useApi } from "@/lib/query";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  status: string;
  description?: string;
}

export default function PortalProjectsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (debounced) params.set("search", debounced);
  const list = useApi<Paginated<Project>>(`/projects/mine?${params}`);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const columns: Column<Project>[] = [
    {
      key: "project",
      header: "Project",
      cell: (p) => (
        <div>
          <Link href={`/portal/projects/${p.id}`} className="text-sm font-medium text-text-primary hover:text-neutral-brand-color">
            {p.name}
          </Link>
          {p.description && <p className="mt-0.5 truncate text-xs text-text-tertiary">{p.description}</p>}
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (p) => <StatusPill status={p.status} /> },
  ];

  return (
    <Page>
      <PageHeader title="Your Projects" />
      <PageBody>
        <PortalOnboardingCard />
        {list.error && <Notice status="error">{list.error.message}</Notice>}
        <SearchBox value={search} onChange={setSearch} placeholder="Search projects..." className="sm:max-w-sm" />
        <DataTable
          columns={columns}
          rows={list.data?.data}
          rowKey={(p) => p.id}
          loading={list.isLoading}
          empty={debounced ? "No projects match your search." : "No projects assigned to you yet."}
        />
        <PagerRow page={page} totalPages={list.data?.meta.totalPages ?? 1} onPageChange={setPage} />
      </PageBody>
    </Page>
  );
}
