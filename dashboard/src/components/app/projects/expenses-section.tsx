"use client";

import { ActionButton, CheckInput, Empty, fmtDate, FormGrid, Loading, money, Panel, StatGrid, StatCard, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import type { ExpenseList } from "@/lib/workflow";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const BLANK = { description: "", amount: "", incurredOn: "", category: "", billable: false };

export function ExpensesSection({ projectId, isArchived }: { projectId: string; isArchived: boolean }) {
  const [list, setList] = useState<ExpenseList | null>(null);
  const [f, setF] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setList(await apiFetch<ExpenseList>(`/projects/${projectId}/expenses`).catch(() => ({ data: [], totalCents: 0, billableCents: 0 })));
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(f.amount) * 100);
    if (Number.isNaN(amountCents) || amountCents < 0) {
      toast.error("Enter a valid amount");
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
      setF(BLANK);
      toast.success("Expense added");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the expense");
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
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <>
      {list && (
        <StatGrid>
          <StatCard label="Total expenses" value={money(list.totalCents)} />
          <StatCard label="Billable to client" value={money(list.billableCents)} />
        </StatGrid>
      )}

      {!isArchived && (
        <Panel title="Add an expense">
          <form onSubmit={create} className="space-y-4">
            <FormGrid>
              <TextInput label="Description" required value={f.description} onChange={(v) => setF((s) => ({ ...s, description: v }))} />
              <TextInput label="Amount" type="number" min={0} step="0.01" required value={f.amount} onChange={(v) => setF((s) => ({ ...s, amount: v }))} />
              <TextInput label="Date" type="date" required value={f.incurredOn} onChange={(v) => setF((s) => ({ ...s, incurredOn: v }))} />
              <TextInput label="Category" value={f.category} onChange={(v) => setF((s) => ({ ...s, category: v }))} placeholder="Software, stock photos..." />
            </FormGrid>
            <CheckInput checked={f.billable} onChange={(v) => setF((s) => ({ ...s, billable: v }))} label="Billable to the client" />
            <ActionButton type="submit" variant="primary" loading={busy} isDisabled={!f.description.trim() || !f.amount || !f.incurredOn}>
              Add expense
            </ActionButton>
          </form>
        </Panel>
      )}

      <Panel title="Expenses">
        {list === null ? (
          <Loading />
        ) : list.data.length === 0 ? (
          <Empty>No expenses logged yet.</Empty>
        ) : (
          <ul className="divide-y divide-card-border">
            {list.data.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{x.description}</p>
                  <p className="text-xs text-text-tertiary">
                    {fmtDate(x.incurredOn)}
                    {x.category ? ` · ${x.category}` : ""}
                    {x.billable ? " · billable" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-numeric text-sm text-text-primary tabular-nums">{money(x.amountCents, x.currency)}</span>
                  {!isArchived && (
                    <Button size="sm" variant="danger" appearance="ghost" onPress={() => remove(x.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
