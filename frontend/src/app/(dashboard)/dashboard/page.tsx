"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { authClient } from "@/lib/auth/client";
import {
  Alert,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  StatCard,
  StatCardSkeleton,
  StatusBadge,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  buttonStyles,
} from "@/components/ui";
import {
  FolderKanban,
  TrendingUp,
  DollarSign,
  Plus,
  ArrowUpRight,
  Receipt,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  clients?: { user?: { name?: string } }[];
}

interface Stats {
  total: number;
  inProgress: number;
  completed: number;
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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats | null>(null);
  const [recent, setRecent] = useState<Project[]>([]);
  const [error, setError] = useState("");
  const [me, setMe] = useState<{ user?: { name?: string } } | null>(null);

  useEffect(() => {
    apiFetch<{ user?: { name?: string } }>("/auth/me")
      .then(setMe)
      .catch(() => {});
    apiFetch<Stats>("/projects/stats")
      .then(setStats)
      .catch((err) => setError(err.message || "Failed to load stats"));
    apiFetch<PaginatedResponse<Project>>("/projects?limit=5")
      .then((res) => setRecent(res.data))
      .catch(console.error);
    apiFetch<InvoiceStats>("/invoices/stats")
      .then(setInvoiceStats)
      .catch(console.error);
  }, []);

  const fullName = me?.user?.name;
  const firstName = fullName ? fullName.split(" ")[0] : "User";

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <>
            Welcome back, {firstName} <span className="text-base">👋</span>
          </>
        }
        description="Your current portfolio summary and activity."
        actions={
          <Link href="/dashboard/projects" className={buttonStyles({ size: "md" })}>
            <Plus aria-hidden />
            <span>New Project</span>
          </Link>
        }
      />

      {error && <Alert status="error">{error}</Alert>}

      {/* Workspace metrics */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {stats === null ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Projects"
              value={stats.total}
              icon={FolderKanban}
              tone="brand"
              footer={
                <p className="text-xs leading-5 text-text-tertiary">Active in workspace</p>
              }
            />
            <StatCard
              title="In Progress"
              value={stats.inProgress}
              icon={TrendingUp}
              tone="blue"
              footer={
                <p className="text-xs leading-5 text-text-tertiary">
                  Active development &amp; tasks
                </p>
              }
            />
            <StatCard
              title="Outstanding Receivables"
              value={invoiceStats ? formatCurrency(invoiceStats.outstandingAmount) : "$0.00"}
              icon={Receipt}
              tone="red"
              footer={
                <p className="text-xs leading-5 text-text-tertiary">
                  Unpaid balance for period
                </p>
              }
            />
            <StatCard
              title="Total Collected"
              value={invoiceStats ? formatCurrency(invoiceStats.paidAmount) : "$0.00"}
              icon={DollarSign}
              tone="violet"
              footer={
                <p className="text-xs leading-5 text-text-tertiary">
                  Net paid revenue &amp; invoices
                </p>
              }
            />
          </>
        )}
      </div>

      {/* Recent projects */}
      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-5 py-4">
          <div className="min-w-0">
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Latest transaction activity &amp; workspace status</CardDescription>
          </div>
          <Link
            href="/dashboard/projects"
            className={buttonStyles({ variant: "ghost", size: "xs" })}
          >
            <span>View all</span>
            <ArrowUpRight aria-hidden />
          </Link>
        </CardHeader>

        {recent.length > 0 ? (
          <TableRoot>
            <TableHeader>
              <TableRow className="bg-background-gray-secondary_alt">
                <TableHead className="text-xs font-semibold text-text-secondary">Ref.</TableHead>
                <TableHead className="text-xs font-semibold text-text-secondary">Date</TableHead>
                <TableHead className="text-xs font-semibold text-text-secondary">
                  Project Title
                </TableHead>
                <TableHead className="text-xs font-semibold text-text-secondary">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-text-secondary">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((project, idx) => {
                const refCode = `PROJ-${String(idx + 1).padStart(4, "0")}`;
                return (
                  <TableRow key={project.id} className="hover:bg-background-gray-primary">
                    <TableCell className="font-mono text-xs text-text-tertiary">
                      {refCode}
                    </TableCell>
                    <TableCell className="text-sm leading-5 whitespace-nowrap text-text-secondary">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm leading-5 font-medium text-text-primary">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="transition-colors hover:text-neutral-brand-color"
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={project.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className={buttonStyles({ variant: "ghost", size: "xs" })}
                      >
                        <span>Open Workspace</span>
                        <ArrowUpRight aria-hidden />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableRoot>
        ) : stats !== null ? (
          <EmptyState
            variant="plain"
            icon={<FolderKanban className="size-5" aria-hidden />}
            title="No projects created yet"
            description="Get started by creating your first project workspace."
            action={
              <Link
                href="/dashboard/projects"
                className={buttonStyles({ variant: "primary", appearance: "outline", size: "sm" })}
              >
                <span>Create Project</span>
                <ArrowUpRight aria-hidden />
              </Link>
            }
          />
        ) : null}
      </Card>
    </div>
  );
}
