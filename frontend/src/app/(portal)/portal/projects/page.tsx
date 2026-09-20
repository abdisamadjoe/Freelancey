"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { Pagination } from "@/components/pagination";
import { PortalOnboardingCard } from "@/components/portal-onboarding-card";
import { FolderOpen } from "lucide-react";
import {
  Alert,
  Card,
  DataToolbar,
  EmptyState,
  PageHeader,
  SearchInput,
  StatusBadge,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  TableRowSkeleton,
} from "@/components/ui";

interface Project {
  id: string;
  name: string;
  status: string;
  description?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export default function PortalProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await apiFetch<PaginatedResponse<Project>>(
        `/projects/mine?${params}`,
      );
      setProjects(res.data);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  return (
    <div className="space-y-5">
      <PageHeader title="Your Projects" />

      <PortalOnboardingCard />

      {error && <Alert status="error" title={error} />}

      <Card className="overflow-hidden p-0">
        <DataToolbar>
          <SearchInput
            wrapperClassName="w-full sm:max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            aria-label="Search projects"
            maxLength={200}
            onClear={() => setSearch("")}
          />
        </DataToolbar>

        {loading ? (
          <div>
            {Array.from({ length: 3 }).map((_, index) => (
              <TableRowSkeleton key={index} columns={3} />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={FolderOpen}
            title={
              debouncedSearch
                ? "No projects match your search."
                : "No projects assigned to you yet."
            }
          />
        ) : (
          <TableRoot>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-background-gray-secondary_alt text-text-secondary">
                  Project
                </TableHead>
                <TableHead className="bg-background-gray-secondary_alt text-text-secondary">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow
                  key={project.id}
                  className="relative hover:bg-background-gray-secondary_alt"
                >
                  <TableCell>
                    <Link
                      href={`/portal/projects/${project.id}`}
                      className="text-sm font-medium text-text-primary transition-colors after:absolute after:inset-0 hover:text-neutral-brand-color"
                    >
                      {project.name}
                    </Link>
                    {project.description && (
                      <p className="mt-0.5 truncate text-xs leading-5 text-text-tertiary">
                        {project.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusBadge status={project.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableRoot>
        )}

        {!loading && projects.length > 0 && totalPages > 1 ? (
          <div className="border-t border-card-border px-5 py-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
