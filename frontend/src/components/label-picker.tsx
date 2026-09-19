"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Pencil, Settings } from "lucide-react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { ColorPatchGrid, PRESET_COLORS } from "@/components/color-patch-grid";

interface Label {
  id: string;
  name: string;
  color: string;
}

export function LabelPicker({
  labels,
  assigned,
  onToggle,
  onLabelsChange,
  disabled,
  align = "left",
}: {
  labels: Label[];
  assigned: string[];
  onToggle: (labelId: string) => void;
  onLabelsChange?: (labels: Label[]) => void;
  disabled?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(PRESET_COLORS[0].hex);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  const assignedSet = new Set(assigned);

  const handleCreate = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    setCreateError("");
    try {
      const created = await apiFetch<Label>("/labels", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (onLabelsChange) {
        const updated = await apiFetch<Label[]>("/labels");
        onLabelsChange(updated);
      }
      onToggle(created.id);
      setNewName("");
      setNewColor(PRESET_COLORS[0].hex);
      setCreating(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create label");
    } finally {
      setSaving(false);
    }
  };

  const menuItemStyles =
    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-background-gray-secondary_alt hover:text-text-primary";

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        aria-label="Edit labels"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Pencil />
      </Button>

      {open && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full z-50 mt-1 flex w-64 flex-col overflow-hidden rounded-xl border border-card-border bg-dropdowns-background shadow-md`}
        >
          {/* Existing labels */}
          <div className="max-h-48 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
            {labels.length === 0 && !creating && (
              <p className="px-3 py-2 text-xs text-text-tertiary">
                No labels yet.
              </p>
            )}
            {labels.map((label) => (
              <div
                key={label.id}
                role="option"
                aria-selected={assignedSet.has(label.id)}
                onClick={() => onToggle(label.id)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-background-gray-secondary_alt hover:text-text-primary"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                <span className="flex-1 truncate text-left">{label.name}</span>
                <span
                  className={`flex size-4 items-center justify-center rounded border text-[10px] ${
                    assignedSet.has(label.id)
                      ? "border-brand-500 bg-brand-500 text-white-100"
                      : "border-card-border"
                  }`}
                >
                  {assignedSet.has(label.id) && "✓"}
                </span>
              </div>
            ))}
          </div>

          {/* Inline create */}
          {creating ? (
            <div className="space-y-2 border-t border-border-primary px-3 py-2">
              <Input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Label name"
                maxLength={50}
                className="h-9 py-0 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
              />
              <ColorPatchGrid value={newColor} onChange={setNewColor} />
              {createError && (
                <p className="text-xs text-input-error">{createError}</p>
              )}
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreate}
                  disabled={!newName.trim() || saving}
                  className="flex-1"
                >
                  {saving ? "Creating..." : "Create"}
                </Button>
                <Button
                  type="button"
                  appearance="outline"
                  size="sm"
                  onClick={() => { setCreating(false); setCreateError(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-t border-border-primary">
              <button
                type="button"
                onClick={() => setCreating(true)}
                className={menuItemStyles}
              >
                <Plus className="size-3.5 shrink-0" />
                Create new label
              </button>
              <Link
                href="/dashboard/settings/workspace"
                onClick={() => setOpen(false)}
                className={menuItemStyles}
              >
                <Settings className="size-3.5 shrink-0" />
                Manage labels
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
