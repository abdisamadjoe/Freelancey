import { cn } from "@/lib/utils";

/**
 * Ported from the NextAdmin template's Skeleton primitive
 * (dashboard/src/components/tailgrids/core/skeleton.tsx) plus the app's
 * loading placeholders, restyled to the template surface.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("h-3 animate-pulse rounded-full bg-skeleton-gradient-50", className)}
      {...props}
    />
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border-[0.5px] border-card-border bg-card-background p-5", className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-7 w-16" />
      <Skeleton className="mt-3 h-2.5 w-32" />
    </div>
  );
}

export function StatCardSkeleton() {
  return <CardSkeleton />;
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-border-primary px-5 py-4 last:border-b-0">
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3", index === 0 ? "w-40" : index === columns - 1 ? "ml-auto w-16" : "w-24")}
        />
      ))}
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="rounded-xl border-[0.5px] border-card-border bg-card-background p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="mt-2 h-2.5 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function ProjectCardSkeleton() {
  return <ListItemSkeleton />;
}

export function FileItemSkeleton() {
  return <ListItemSkeleton />;
}

export function InvoiceCardSkeleton() {
  return <ListItemSkeleton />;
}

export function ClientItemSkeleton() {
  return <ListItemSkeleton />;
}

export function UpdateItemSkeleton() {
  return (
    <div className="rounded-xl border-[0.5px] border-card-border bg-card-background p-4">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-3/4" />
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="mt-2.5 h-3 w-96 max-w-full" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-24 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border-[0.5px] border-card-border bg-card-background">
        {Array.from({ length: 4 }).map((_, index) => (
          <TableRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-7 w-56" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <div className="rounded-xl border-[0.5px] border-card-border bg-card-background p-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
