"use client";

import { AppTabs, ErrorNote, fmtDate, Loading, Notice, Page, PageBody, PageHeader, StatusPill } from "@/components/app/kit";
import { PortalContractsSection } from "@/components/app/portal/portal-contracts";
import { PortalFilesSection } from "@/components/app/portal/portal-files";
import { PortalInvoicesSection } from "@/components/app/portal/portal-invoices";
import { PortalTasksSection } from "@/components/app/portal/portal-tasks";
import { UpdatesSection } from "@/components/app/projects/updates-section";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  archivedAt?: string | null;
  files: {
    id: string;
    filename: string;
    type?: "UPLOAD" | "LINK";
    mimeType?: string | null;
    sizeBytes?: number | null;
    url?: string | null;
    description?: string | null;
    createdAt: string;
  }[];
}

const TAB_IDS = ["updates", "tasks", "files", "contracts", "invoices"];

function Content() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const session = useSession();
  const [project, setProject] = useState<Project | null>(null);
  const [statusName, setStatusName] = useState<string | undefined>();
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(() => {
    apiFetch<Project>(`/projects/mine/${id}`)
      .then(setProject)
      .catch(setError);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!project) return;
    apiFetch<{ slug: string; name: string }[]>("/projects/statuses")
      .then((list) => setStatusName(list.find((s) => s.slug === project.status)?.name))
      .catch(() => {});
  }, [project]);

  const tabParam = searchParams.get("tab");
  const initial = tabParam && TAB_IDS.includes(tabParam) ? tabParam : searchParams.get("task") ? "tasks" : "updates";

  if (!project) {
    return error ? (
      <Page>
        <PageBody>
          <ErrorNote error={error} />
        </PageBody>
      </Page>
    ) : (
      <Loading />
    );
  }

  const archived = !!project.archivedAt;

  return (
    <Page>
      <PageHeader
        title={project.name}
        description={
          <>
            {project.description}
            {project.startDate || project.endDate ? (
              <span className="block">
                {project.startDate ? `Starts ${fmtDate(project.startDate)}` : ""}
                {project.startDate && project.endDate ? " · " : ""}
                {project.endDate ? `Due ${fmtDate(project.endDate)}` : ""}
              </span>
            ) : null}
          </>
        }
        actions={<StatusPill status={project.status} label={statusName} />}
      />
      <PageBody>
        {archived && <Notice status="warning">This project has been archived.</Notice>}
        <AppTabs
          defaultValue={initial}
          tabs={[
            {
              value: "updates",
              label: "Updates",
              content: (
                <UpdatesSection
                  projectId={id}
                  isArchived={archived}
                  currentUserId={session.user.id}
                  currentRole="member"
                  timelinePath={`/updates/timeline/mine/${id}`}
                  onFileChange={load}
                />
              ),
            },
            { value: "tasks", label: "Tasks", content: <PortalTasksSection projectId={id} isArchived={archived} /> },
            {
              value: "files",
              label: "Files",
              content: <PortalFilesSection projectId={id} files={project.files} isArchived={archived} onFilesChange={load} />,
            },
            { value: "contracts", label: "Contracts", content: <PortalContractsSection projectId={id} /> },
            { value: "invoices", label: "Invoices", content: <PortalInvoicesSection projectId={id} /> },
          ]}
        />
      </PageBody>
    </Page>
  );
}

export default function PortalProjectPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}
