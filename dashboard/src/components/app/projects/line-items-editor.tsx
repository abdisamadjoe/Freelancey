"use client";

import { Button } from "@/components/tailgrids/core/button";
import { money, TextInput } from "@/components/app/kit";

export interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export const BLANK_ITEM: LineItem = { description: "", quantity: 1, unitPrice: 0 };

export function LineItemsEditor({ items, onChange }: { items: LineItem[]; onChange: (next: LineItem[]) => void }) {
  const update = (i: number, patch: Partial<LineItem>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-12 items-end gap-2">
          <div className="col-span-12 sm:col-span-6">
            <TextInput label={index === 0 ? "Description" : undefined} value={item.description} onChange={(v) => update(index, { description: v })} />
          </div>
          <div className="col-span-4 sm:col-span-2">
            <TextInput label={index === 0 ? "Qty" : undefined} type="number" min={1} value={item.quantity} onChange={(v) => update(index, { quantity: Math.max(1, parseInt(v || "1", 10)) })} />
          </div>
          <div className="col-span-5 sm:col-span-3">
            <TextInput
              label={index === 0 ? "Unit price" : undefined}
              type="number"
              min={0}
              step="0.01"
              value={item.unitPrice ? item.unitPrice / 100 : ""}
              onChange={(v) => update(index, { unitPrice: Math.round(parseFloat(v || "0") * 100) })}
            />
          </div>
          <div className="col-span-3 sm:col-span-1">
            {items.length > 1 && (
              <Button size="sm" variant="danger" appearance="ghost" onPress={() => onChange(items.filter((_, i) => i !== index))}>
                Remove
              </Button>
            )}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button size="sm" appearance="outline" variant="primary" onPress={() => onChange([...items, { ...BLANK_ITEM }])}>
          Add line
        </Button>
        <p className="font-numeric text-lg font-semibold text-text-primary tabular-nums">{money(total)}</p>
      </div>
    </div>
  );
}
