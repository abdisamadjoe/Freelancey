"use client";

import { PdfViewer } from "@/components/app/documents/pdf-viewer";
import { ActionButton, Modal, Notice, TextAreaInput, TextInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/utils/cn";
import { useCallback, useEffect, useState } from "react";

type FieldType = "signature" | "date" | "initials" | "text" | "select";

interface PlacedField {
  id: string;
  pageNumber: number; // 0-indexed
  x: number; // 0-1
  y: number;
  width: number;
  height: number;
  type: FieldType;
  label?: string;
  signerOrder: number;
  assignedTo?: string;
}

const TYPE_LABEL: Record<FieldType, string> = {
  signature: "Sign Here",
  date: "Date",
  initials: "Initials",
  text: "Text",
  select: "Select",
};

const TYPE_STYLE: Record<FieldType, string> = {
  signature: "border-badge-warning-icon-color bg-badge-warning-background text-badge-warning-text",
  date: "border-badge-blue-icon-color bg-badge-blue-background text-badge-blue-text",
  initials: "border-badge-purple-icon-color bg-badge-purple-background text-badge-purple-text",
  text: "border-badge-success-icon-color bg-badge-success-background text-badge-success-text",
  select: "border-badge-cyan-icon-color bg-badge-cyan-background text-badge-cyan-text",
};

const SIZES: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 0.25, height: 0.06 },
  date: { width: 0.18, height: 0.035 },
  initials: { width: 0.1, height: 0.05 },
  text: { width: 0.25, height: 0.035 },
  select: { width: 0.25, height: 0.035 },
};

const FIELD_TYPES: FieldType[] = ["signature", "date", "initials", "text", "select"];

/** Click on the PDF to drop a signature, date, initials, text or select field; drag to move. */
export function SignatureFieldPlacer({ documentId, onClose, onSaved }: { documentId: string; onClose: () => void; onSaved: () => void }) {
  const [fields, setFields] = useState<PlacedField[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<FieldType>("signature");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  useEffect(() => {
    apiFetch<{ signatureFields?: (Omit<PlacedField, "type" | "signerOrder"> & { type?: string; signerOrder?: number })[] }>(`/documents/${documentId}`)
      .then((doc) => {
        if (doc.signatureFields?.length) {
          setFields(
            doc.signatureFields.map((f) => ({
              id: f.id,
              pageNumber: f.pageNumber,
              x: f.x,
              y: f.y,
              width: f.width,
              height: f.height,
              type: (f.type || "signature") as FieldType,
              label: f.label,
              signerOrder: f.signerOrder ?? 0,
              assignedTo: f.assignedTo,
            })),
          );
        }
      })
      .catch(() => {});
  }, [documentId]);

  const placeAt = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, pageNumber: number, dims: { width: number; height: number }) => {
      if ((e.target as HTMLElement).closest("[data-field]")) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const size = SIZES[activeType];
      const x = Math.max(0, Math.min(1 - size.width, (e.clientX - rect.left) / dims.width));
      const y = Math.max(0, Math.min(1 - size.height, (e.clientY - rect.top) / dims.height));
      const field: PlacedField = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        pageNumber: pageNumber - 1,
        x,
        y,
        width: size.width,
        height: size.height,
        type: activeType,
        signerOrder: 0,
      };
      setFields((prev) => [...prev, field]);
      if (activeType === "select") {
        setEditingId(field.id);
        setEditingLabel("");
      }
    },
    [activeType],
  );

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/documents/${documentId}/signature-fields`, {
        method: "PUT",
        body: JSON.stringify({
          fields: fields.map((f) => ({
            pageNumber: f.pageNumber,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            type: f.type,
            label: f.label,
            signerOrder: f.signerOrder,
            assignedTo: f.assignedTo,
          })),
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save signature fields");
    } finally {
      setSaving(false);
    }
  };

  const editing = fields.find((f) => f.id === editingId);
  const editingSelect = editing?.type === "select";

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title="Place Fields"
      description="Select a field type and click on the document to place it. Drag a field to move it."
      footer={
        <>
          <span className="mr-auto self-center text-xs text-text-tertiary">
            {fields.length} field{fields.length !== 1 ? "s" : ""} placed
          </span>
          <Button appearance="outline" variant="primary" onPress={onClose}>
            Cancel
          </Button>
          <ActionButton variant="primary" loading={saving} isDisabled={fields.length === 0} onPress={save}>
            Save Fields
          </ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Notice status="error">{error}</Notice>}
        <div className="flex flex-wrap gap-2">
          {FIELD_TYPES.map((t) => (
            <Button key={t} size="sm" appearance={activeType === t ? "fill" : "outline"} variant="primary" onPress={() => setActiveType(t)}>
              {TYPE_LABEL[t]}
            </Button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-background-gray-secondary_alt p-3">
          <PdfViewer
            path={`/documents/${documentId}/view`}
            overlay={(pageNumber, dims) => (
              <div
                className="relative cursor-crosshair"
                style={{ width: dims.width, height: dims.height }}
                onClick={(e) => placeAt(e, pageNumber, dims)}
                onPointerMove={(e) => {
                  if (!dragging) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const f = fields.find((x) => x.id === dragging.id);
                  if (!f) return;
                  const nx = Math.max(0, Math.min(1 - f.width, (e.clientX - rect.left - dragging.offsetX) / dims.width));
                  const ny = Math.max(0, Math.min(1 - f.height, (e.clientY - rect.top - dragging.offsetY) / dims.height));
                  setFields((prev) => prev.map((x) => (x.id === dragging.id ? { ...x, x: nx, y: ny } : x)));
                }}
                onPointerUp={() => setDragging(null)}
              >
                {fields
                  .filter((f) => f.pageNumber === pageNumber - 1)
                  .map((f) => (
                    <div
                      key={f.id}
                      data-field
                      className={cn("absolute flex cursor-move items-center justify-between gap-1 rounded border px-1 text-[10px] font-medium", TYPE_STYLE[f.type])}
                      style={{ left: f.x * dims.width, top: f.y * dims.height, width: f.width * dims.width, height: f.height * dims.height }}
                      onPointerDown={(e) => {
                        const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                        setDragging({ id: f.id, offsetX: e.clientX - rect.left - f.x * dims.width, offsetY: e.clientY - rect.top - f.y * dims.height });
                        (e.target as HTMLElement).setPointerCapture(e.pointerId);
                      }}
                    >
                      <span className="truncate">{f.label || TYPE_LABEL[f.type]}</span>
                      <span className="flex shrink-0 gap-1">
                        {(f.type === "text" || f.type === "select") && (
                          <button
                            type="button"
                            aria-label="Edit field"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(f.id);
                              setEditingLabel(f.type === "select" ? (f.label ?? "").split(",").join("\n") : (f.label ?? ""));
                            }}
                          >
                            ✎
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Remove field"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFields((prev) => prev.filter((x) => x.id !== f.id));
                          }}
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ))}
              </div>
            )}
          />
        </div>
      </div>

      <Modal
        open={!!editingId}
        onClose={() => setEditingId(null)}
        title={editingSelect ? "Configure Options" : "Configure Field"}
        footer={
          <>
            <Button appearance="outline" variant="primary" onPress={() => setEditingId(null)}>
              Cancel
            </Button>
            <ActionButton
              variant="primary"
              onPress={() => {
                const label = editingSelect
                  ? editingLabel
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean)
                      .join(",")
                  : editingLabel.trim();
                setFields((prev) => prev.map((f) => (f.id === editingId ? { ...f, label: label || undefined } : f)));
                setEditingId(null);
              }}
            >
              Save
            </ActionButton>
          </>
        }
      >
        {editingSelect ? (
          <TextAreaInput
            label="Options (one per line)"
            hint="Enter each option on a separate line. The signer will choose one."
            rows={5}
            value={editingLabel}
            onChange={setEditingLabel}
            placeholder={"Option A\nOption B\nOption C"}
          />
        ) : (
          <TextInput label="Label" value={editingLabel} onChange={setEditingLabel} placeholder="Field label" />
        )}
      </Modal>
    </Modal>
  );
}
