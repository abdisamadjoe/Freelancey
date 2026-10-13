"use client";

/**
 * Feature-level building blocks composed only from the dashboard's own components
 * (Card, Table, Dialog, TextField, Select, Badge, Alert, Skeleton, Spinner) using the
 * same markup and classes as the template pages. No new visual language lives here.
 */

import { Alert, AlertContent, AlertDescription, AlertIndicator } from "@/components/tailgrids/core/alert";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button, type ButtonProps } from "@/components/tailgrids/core/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { FieldError } from "@/components/tailgrids/core/field";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import { Pagination } from "@/components/tailgrids/core/pagination";
import { Skeleton } from "@/components/tailgrids/core/skeleton";
import { Spinner } from "@/components/tailgrids/core/spinner";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";
import { TextArea } from "@/components/tailgrids/core/text-area";
import { TextField } from "@/components/tailgrids/core/text-field";
import { Toggle } from "@/components/tailgrids/core/toggle";
import type { BadgeColor } from "@/lib/badge-color";
import { cn } from "@/utils/cn";
import Link from "next/link";
import type { ReactNode } from "react";
import { DialogTrigger } from "react-aria-components";

/* ───────────────────────── Page scaffolding (home page markup) ───────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 px-2 sm:flex-row sm:items-center lg:px-6">
      <div>
        <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">{title}</h1>
        {description && <p className="text-sm leading-5 text-text-tertiary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="mt-6 space-y-5">{children}</div>;
}

export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-5 px-2 lg:px-5", className)}>{children}</div>;
}

/** Card with the template's header treatment. */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  flush,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Edge-to-edge content (tables). */
  flush?: boolean;
}) {
  return (
    <Card className={cn(flush && "overflow-hidden p-0", className)}>
      {(title || action) && (
        <CardHeader className={cn(flush && "p-5 pb-0")}>
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </CardHeader>
      )}
      {children !== undefined && (
        <CardContent className={cn(flush ? "mt-4 p-0" : title || action ? "mt-4 p-0" : "p-0")}>{children}</CardContent>
      )}
    </Card>
  );
}

/* ───────────────────────── Stat card (home overview-stats markup) ───────────────────────── */

export function StatCard({
  icon,
  iconClass,
  label,
  value,
  hint,
}: {
  icon?: ReactNode;
  iconClass?: string;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Card>
      {icon && (
        <CardHeader>
          <div className={cn("flex size-8 items-center justify-center rounded-lg", iconClass)}>{icon}</div>
        </CardHeader>
      )}
      <div className={cn("mb-1.25 text-xl leading-7 font-semibold text-text-primary md:text-2xl md:leading-8", icon && "mt-6")}>
        {value}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm leading-5 font-medium text-text-tertiary">{label}</span>
        {hint && <span className="text-sm leading-5 font-medium text-text-tertiary">{hint}</span>}
      </div>
    </Card>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <StatGrid>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="mt-6 mb-1.25 h-7 w-24 rounded-full md:h-8 md:w-28" />
          <Skeleton className="h-4 w-24 rounded-full" />
        </Card>
      ))}
    </StatGrid>
  );
}

/* ───────────────────────── Table (user-table markup) ───────────────────────── */

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
}

const HEAD = "px-6 py-2.5 text-xs leading-4 font-semibold text-text-secondary";
const CELL = "h-16 px-6 py-3 text-sm leading-5 font-normal tracking-[-0.15px] text-text-primary";

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  onRowClick,
  className,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <CardContent className="p-0">
        <TableRoot className="w-full rounded-none border-none">
          <TableHeader>
            <TableRow className="bg-background-gray-secondary_alt">
              {columns.map((c) => (
                <TableHead key={c.key} className={cn(HEAD, c.className)}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="[&_td]:border-none">
                  {columns.map((c) => (
                    <TableCell key={c.key} className={CELL}>
                      <Skeleton className="h-4 w-24 rounded-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading &&
              rows?.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={cn("[&_td]:border-none", onRowClick && "cursor-pointer hover:bg-dropdown-hover-background")}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((c) => (
                    <TableCell key={c.key} className={cn(CELL, c.className)}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
          </TableBody>
        </TableRoot>
        {!loading && rows?.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-text-tertiary">{empty ?? "Nothing here yet."}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm leading-5 font-medium tracking-[-0.15px] whitespace-nowrap text-neutral-brand-color">
      {children}
    </Link>
  );
}

/* ───────────────────────── Form fields (form-elements markup) ───────────────────────── */

const LABEL = "flex items-center gap-0.5 text-sm font-medium text-input-label-text";
const INPUT = "w-full px-3 py-2.5 text-sm";

export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-3")}>
      {children}
    </div>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <span className={LABEL}>
          {label}
          {required && <span className="text-sm font-medium text-error-500">*</span>}
        </span>
      )}
      {children}
      {hint && <span className="text-xs text-text-tertiary">{hint}</span>}
      {error && <span className="text-xs text-error-500">{error}</span>}
    </div>
  );
}

export function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  disabled,
  hint,
  name,
  min,
  max,
  step,
  autoComplete,
}: {
  label?: ReactNode;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
  name?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  autoComplete?: string;
}) {
  return (
    <TextField className="w-full flex-col gap-1.5" value={String(value)} onChange={onChange} required={required} disabled={disabled} name={name}>
      {label && (
        <Label className={LABEL}>
          {label}
          {required && <span className="text-sm font-medium text-error-500">*</span>}
        </Label>
      )}
      <Input
        type={type}
        placeholder={placeholder}
        className={INPUT}
        min={min}
        max={max}
        step={step}
        autoComplete={autoComplete}
      />
      {hint && <span className="text-xs text-text-tertiary">{hint}</span>}
      <FieldError />
    </TextField>
  );
}

export function TextAreaInput({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required,
  disabled,
  hint,
}: {
  label?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
}) {
  return (
    <TextField className="w-full flex-col gap-1.5" value={value} onChange={onChange} required={required} disabled={disabled}>
      {label && (
        <Label className={LABEL}>
          {label}
          {required && <span className="text-sm font-medium text-error-500">*</span>}
        </Label>
      )}
      <TextArea rows={rows} placeholder={placeholder} className="text-sm" />
      {hint && <span className="text-xs text-text-tertiary">{hint}</span>}
    </TextField>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function SelectInput({
  label,
  value,
  onChange,
  options,
  placeholder = "Select option",
  required,
  disabled,
  className,
}: {
  label?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: readonly Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {label && (
        <span className={LABEL}>
          {label}
          {required && <span className="text-sm font-medium text-error-500">*</span>}
        </span>
      )}
      <Select
        value={value}
        onChange={(v) => onChange(String(v ?? ""))}
        className="w-full"
        aria-label={typeof label === "string" ? label : placeholder}
        placeholder={placeholder}
        isDisabled={disabled}
      >
        <SelectTrigger className="w-full border-border-secondary bg-input-background py-2.5">
          <SelectValue />
          <SelectIndicator />
        </SelectTrigger>
        <SelectContent className="min-w-(--trigger-width)">
          {options.map((o) => (
            <SelectItem key={o.value || "__empty"} id={o.value} textValue={o.label}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CheckInput({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Checkbox isSelected={checked} onChange={onChange} isDisabled={disabled}>
      <span className="text-sm text-text-primary">{label}</span>
    </Checkbox>
  );
}

export function SwitchInput({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return <Toggle label={label} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />;
}

/* ───────────────────────── Buttons ───────────────────────── */

export function ActionButton({
  loading,
  children,
  isDisabled,
  ...props
}: Omit<ButtonProps, "children"> & { loading?: boolean; children?: ReactNode }) {
  return (
    <Button size="md" {...props} isDisabled={isDisabled || loading}>
      {loading && <Spinner size="sm" />}
      {children}
    </Button>
  );
}

/* ───────────────────────── Modal (Dialog) ───────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <DialogTrigger isOpen={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog className={cn("max-h-[90vh] overflow-y-auto", wide && "max-w-3xl")}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children && <DialogBody>{children}</DialogBody>}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </Dialog>
    </DialogTrigger>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button appearance="outline" variant="primary" onPress={onClose}>
            Cancel
          </Button>
          <ActionButton variant={danger ? "danger" : "primary"} appearance="fill" loading={loading} onPress={onConfirm}>
            {confirmLabel}
          </ActionButton>
        </>
      }
    />
  );
}

/* ───────────────────────── Status / feedback ───────────────────────── */

export function StatusBadge({ color = "gray", children }: { color?: BadgeColor; children: ReactNode }) {
  return <Badge color={color}>{children}</Badge>;
}

export function Notice({
  status = "default",
  children,
}: {
  status?: "default" | "success" | "warning" | "error" | "info";
  children: ReactNode;
}) {
  return (
    <Alert status={status}>
      <AlertIndicator />
      <AlertContent>
        <AlertDescription>{children}</AlertDescription>
      </AlertContent>
    </Alert>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-text-tertiary">
      <Spinner size="md" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-text-tertiary">{children}</p>;
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="space-y-3 py-6">
      <Notice status="error">{message}</Notice>
      {onRetry && (
        <Button appearance="outline" variant="primary" size="sm" onPress={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("text-sm text-text-tertiary", className)}>{children}</span>;
}

/* ───────────────────────── Shared status vocabulary ───────────────────────── */

const STATUS_COLORS: Record<string, BadgeColor> = {
  not_started: "gray",
  in_progress: "blue",
  in_review: "warning",
  completed: "success",
  on_hold: "gray",
  cancelled: "error",
  archived: "gray",
  open: "gray",
  done: "success",
  draft: "gray",
  sent: "blue",
  viewed: "violet",
  paid: "success",
  overdue: "error",
  void: "gray",
  voided: "gray",
  pending: "warning",
  accepted: "success",
  declined: "error",
  rejected: "error",
  acknowledged: "blue",
  signed: "success",
  expired: "gray",
  active: "success",
  inactive: "gray",
  failed: "error",
  resolved: "success",
};

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
};

export function statusColor(status: string | null | undefined): BadgeColor {
  if (!status) return "gray";
  return STATUS_COLORS[status.toLowerCase().replace(/[\s-]+/g, "_")] ?? "gray";
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return "-";
  const key = status.toLowerCase().replace(/[\s-]+/g, "_");
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function StatusPill({ status, label }: { status: string | null | undefined; label?: string }) {
  return <Badge color={statusColor(status)}>{label ?? statusLabel(status)}</Badge>;
}

/* ───────────────────────── Lists, definition rows, toolbars ───────────────────────── */

/** Card with divided rows (the "last transactions" list pattern). */
export function ListRows({ children, className }: { children: ReactNode; className?: string }) {
  return <ul className={cn("divide-y divide-card-border", className)}>{children}</ul>;
}

export function ListRow({
  href,
  onClick,
  children,
  className,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const body = "flex items-center justify-between gap-3 px-5 py-3 text-left";
  if (href) {
    return (
      <li>
        <Link href={href} className={cn(body, "transition-colors hover:bg-background-gray-primary", className)}>
          {children}
        </Link>
      </li>
    );
  }
  if (onClick) {
    return (
      <li>
        <button type="button" onClick={onClick} className={cn(body, "w-full transition-colors hover:bg-background-gray-primary", className)}>
          {children}
        </button>
      </li>
    );
  }
  return <li className={cn(body, className)}>{children}</li>;
}

export function DefList({ rows }: { rows: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map((r, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs text-text-tertiary">{r.label}</dt>
          <dd className="mt-0.5 text-sm break-words text-text-primary">{r.value || <span className="text-text-tertiary">-</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <TextField className={cn("w-full sm:w-72", className)} value={value} onChange={onChange} aria-label={placeholder}>
      <Input placeholder={placeholder} className={INPUT} type="search" />
    </TextField>
  );
}

export function PagerRow({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="w-full">
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}

export function LabelChip({ name, color }: { name: string; color: string }) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const dark = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs leading-4 font-medium whitespace-nowrap"
      style={{ backgroundColor: color, color: dark ? "#000000" : "#ffffff" }}
    >
      {name}
    </span>
  );
}

export function money(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function fmtDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString() : "-";
}

export function fmtDateTime(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString() : "-";
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
