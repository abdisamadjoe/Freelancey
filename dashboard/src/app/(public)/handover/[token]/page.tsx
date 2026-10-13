import { PublicHeader, PublicShell } from "@/components/app/public";
import { Panel, StatusBadge } from "@/components/app/kit";
import type { HandoverItemRow } from "@/lib/workflow";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const API_URL = process.env.API_URL || "http://localhost:3001";

interface PublicHandover {
  organizationName: string;
  primaryColor: string | null;
  logoUrl: string | null;
  projectName: string;
  status: string;
  completedAt: string | null;
  items: HandoverItemRow[];
}

async function getHandover(token: string): Promise<PublicHandover | null> {
  try {
    const res = await fetch(`${API_URL}/api/handover/public/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicHandover;
  } catch {
    return null;
  }
}

export const metadata: Metadata = { title: "Project handover", robots: { index: false, follow: false } };

export default async function HandoverPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const h = await getHandover(token);
  if (!h) notFound();

  return (
    <PublicShell primaryColor={h.primaryColor}>
      <PublicHeader logoUrl={h.logoUrl} eyebrow={h.organizationName} title={`${h.projectName}: handover`}>
        <StatusBadge color={h.status === "completed" ? "success" : "blue"}>{h.status === "completed" ? "Complete" : "In progress"}</StatusBadge>
      </PublicHeader>
      <Panel>
        <ul className="divide-y divide-card-border">
          {h.items.map((item) => (
            <li key={item.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
              <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <StatusBadge color={item.done ? "success" : "gray"}>{item.done ? "Done" : "To do"}</StatusBadge>
                {item.title}
              </p>
              {item.details && <p className="text-sm whitespace-pre-wrap text-text-secondary">{item.details}</p>}
              {item.linkUrl && (
                <a href={item.linkUrl} target="_blank" rel="noreferrer noopener" className="text-sm font-medium text-neutral-brand-color hover:underline">
                  Open
                </a>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </PublicShell>
  );
}
