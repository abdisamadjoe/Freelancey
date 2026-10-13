export interface TotalItem {
  quantity: number;
  unitPriceCents: number;
  optional: boolean;
  selected: boolean;
}

/** Required items always count; optional items count only once the client has picked them. */
export function proposalTotalCents(items: TotalItem[]): number {
  return items.reduce(
    (sum, item) => (!item.optional || item.selected ? sum + item.quantity * item.unitPriceCents : sum),
    0,
  );
}
