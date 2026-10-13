import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import type { HandoverItemRow } from "@/lib/workflow";

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

  const style = h.primaryColor
    ? ({
        "--primary": h.primaryColor,
        "--brand-500": h.primaryColor,
        "--brand-600": `color-mix(in srgb, ${h.primaryColor}, #000 15%)`,
      } as React.CSSProperties)
    : undefined;

  return (
    <main style={style} data-branded={style ? "" : undefined} className="relative min-h-screen bg-background-gray-secondary_alt_2 px-4 py-10 sm:py-16">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <div className="text-center">
          {h.logoUrl && <Image src={h.logoUrl} alt="" width={56} height={56} unoptimized className="mx-auto mb-3 size-14 rounded-lg object-contain" />}
          <p className="text-sm text-text-tertiary">{h.organizationName}</p>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">{h.projectName}: handover</h1>
          <div className="mt-2">
            <Badge color={h.status === "completed" ? "success" : "blue"}>{h.status === "completed" ? "Complete" : "In progress"}</Badge>
          </div>
        </div>
        <Card>
          <ul className="divide-y divide-card-border">
            {h.items.map((item) => {
              const Icon = item.done ? CheckCircle2 : Circle;
              return (
                <li key={item.id} className="space-y-1 px-5 py-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <Icon className={item.done ? "size-4 text-alert-success-title" : "size-4 text-text-tertiary"} aria-hidden />
                    {item.title}
                  </p>
                  {item.details && <p className="whitespace-pre-wrap pl-6 text-sm text-text-secondary">{item.details}</p>}
                  {item.linkUrl && (
                    <a href={item.linkUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 pl-6 text-sm font-medium text-neutral-brand-color hover:underline">
                      <ExternalLink className="size-4" aria-hidden />
                      Open
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </main>
  );
}
