"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, CardHeader, CardTitle, Checkbox, EmptyState, Field, Input } from "@/components/ui";
import { formatMoney } from "@/lib/proposals";
import type { ExpenseList } from "@/lib/workflow";

const today = () => new Date().toISOString().slice(0, 10);

export function ExpensesSection({ projectId, isArchived }: { projectId: string; isArchived: boolean }) {
  const { success, error: showError } = useToast();
  const [data, setData] = useState<ExpenseList | null>(null);
  const [f, setF] = useState({ description: "", amount: "", incurredOn: today(), category: "", billable: false });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setData(await apiFetch<ExpenseList>(`/projects/${projectId}/expenses`).catch(() => ({ data: [], totalCents: 0, billableCents: 0 })));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(f.amount) * 100);
    if (Number.isNaN(amountCents) || amountCents < 0) {
      showError("Amount must be a number, 0 or more.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch(`/projects/${projectId}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          description: f.description,
          amountCents,
          incurredOn: new Date(f.incurredOn).toISOString(),
          category: f.category.trim() || undefined,
          billable: f.billable,
        }),
      });
      setF({ description: "", amount: "", incurredOn: today(), category: "", billable: false });
      success("Expense added");
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not add the expense");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await apiFetch(`/projects/${projectId}/expenses/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <div className="space-y-5">
      {!isArchived && (
        <Card>
          <CardHeader>
            <CardTitle>Add an expense</CardTitle>
          </CardHeader>
          <form onSubmit={add} className="space-y-4 p-5 pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="What was it for?" htmlFor="e-desc" required>
                <Input id="e-desc" value={f.description} onChange={(e) => setF((v) => ({ ...v, description: e.target.value }))} maxLength={300} required />
              </Field>
              <Field label="Amount" htmlFor="e-amt" required>
                <Input id="e-amt" type="number" min="0" step="0.01" value={f.amount} onChange={(e) => setF((v) => ({ ...v, amount: e.target.value }))} required />
              </Field>
              <Field label="Date" htmlFor="e-date" required>
                <Input id="e-date" type="date" value={f.incurredOn} onChange={(e) => setF((v) => ({ ...v, incurredOn: e.target.value }))} required />
              </Field>
              <Field label="Category" htmlFor="e-cat">
                <Input id="e-cat" value={f.category} onChange={(e) => setF((v) => ({ ...v, category: e.target.value }))} maxLength={100} placeholder="e.g. Hosting, Stock photos" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <Checkbox checked={f.billable} onChange={() => setF((v) => ({ ...v, billable: !v.billable }))} aria-label="Billable to the client" />
              Billable to the client
            </label>
            <Button type="submit" iconOnly={false} loading={busy} disabled={!f.description.trim() || !f.amount}>
              <Plus />
              <span>Add expense</span>
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Expenses</CardTitle>
          {data && data.data.length > 0 && (
            <span className="text-sm text-text-tertiary">
              {formatMoney(data.totalCents)} total · {formatMoney(data.billableCents)} billable
            </span>
          )}
        </CardHeader>
        {data === null ? (
          <p className="px-5 pb-5 text-sm text-text-tertiary">Loading...</p>
        ) : data.data.length === 0 ? (
          <EmptyState variant="plain" icon={<Receipt className="size-5" aria-hidden />} title="No expenses yet" description="Track what this project costs you." />
        ) : (
          <ul className="divide-y divide-card-border border-t border-card-border">
            {data.data.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{x.description}</p>
                  <p className="text-xs text-text-tertiary">
                    {new Date(x.incurredOn).toLocaleDateString()}
                    {x.category ? ` · ${x.category}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {x.billable && <Badge color="blue">Billable</Badge>}
                  <span className="text-sm text-text-primary">{formatMoney(x.amountCents, x.currency)}</span>
                  {!isArchived && (
                    <Button type="button" size="sm" appearance="ghost" aria-label={`Delete ${x.description}`} onClick={() => remove(x.id)}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
