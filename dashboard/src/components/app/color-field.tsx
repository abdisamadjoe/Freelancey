"use client";

import { cn } from "@/utils/cn";

export const PRESET_COLORS = [
  { hex: "#ef4444", name: "Red" },
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#006b68", name: "Teal" },
  { hex: "#22c55e", name: "Green" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#8b5cf6", name: "Violet" },
] as const;

/** Preset swatches plus a native colour picker. */
export function ColorField({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const isPreset = PRESET_COLORS.some((c) => c.hex.toLowerCase() === value.toLowerCase());
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c.hex}
          type="button"
          aria-label={c.name}
          title={c.name}
          onClick={() => onChange(c.hex)}
          className={cn(
            "size-6 rounded-full border-[0.5px] border-card-border transition-transform hover:scale-105",
            value.toLowerCase() === c.hex && "ring-2 ring-brand-500 ring-offset-2 ring-offset-card-background",
          )}
          style={{ backgroundColor: c.hex }}
        />
      ))}
      <label
        className={cn(
          "relative size-6 cursor-pointer overflow-hidden rounded-full border-[0.5px] border-card-border",
          !isPreset && "ring-2 ring-brand-500 ring-offset-2 ring-offset-card-background",
        )}
        title="Custom colour"
      >
        <span className="absolute inset-0" style={{ backgroundColor: isPreset ? "transparent" : value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label="Custom colour" />
      </label>
    </div>
  );
}
