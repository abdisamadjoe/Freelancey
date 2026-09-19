"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const PRESET_COLORS = [
  { hex: "#ef4444", name: "Red" },
  { hex: "#3b82f6", name: "Blue" },
  { hex: "#006b68", name: "Freelancey" },
  { hex: "#22c55e", name: "Green" },
  { hex: "#f59e0b", name: "Amber" },
  { hex: "#8b5cf6", name: "Violet" },
] as const;

/** Swatch metric shared by the preset colours and the custom picker. */
const SWATCH = cn(
  "size-6 rounded-full border-[0.5px] border-card-border transition-transform",
  "hover:scale-105 active:scale-95 outline-none",
  "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card-background",
);

/** Selected swatch: brand-token ring, mirroring the design system's focus ring. */
const SELECTED = "ring-2 ring-brand-500 ring-offset-2 ring-offset-card-background";

export function ColorPatchGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isCustom = !PRESET_COLORS.some((c) => c.hex === value);

  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Label color">
      {PRESET_COLORS.map((color) => {
        const selected = value === color.hex;
        return (
          <button
            key={color.hex}
            type="button"
            role="radio"
            aria-checked={selected}
            title={color.name}
            aria-label={color.name}
            onClick={() => onChange(color.hex)}
            className={cn(SWATCH, selected && SELECTED)}
            style={{ backgroundColor: color.hex }}
          />
        );
      })}
      <div className="relative">
        <button
          type="button"
          role="radio"
          title="Custom color"
          aria-label="Custom color"
          aria-checked={isCustom}
          onClick={() => inputRef.current?.click()}
          className={cn(
            SWATCH,
            "flex items-center justify-center",
            isCustom ? SELECTED : "border-dashed bg-background-gray-primary",
          )}
          style={isCustom ? { backgroundColor: value } : undefined}
        >
          {!isCustom && <Plus className="size-3.5 text-icon-tertiary" aria-hidden />}
        </button>
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          tabIndex={-1}
          aria-label="Custom label color"
        />
      </div>
    </div>
  );
}
