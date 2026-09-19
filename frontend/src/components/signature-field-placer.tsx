"use client";

import { useState, useEffect, useCallback } from "react";
import { Pencil, X } from "lucide-react";
import { PdfViewer } from "./pdf-viewer";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Alert,
  Badge,
  Button,
  Field,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tab,
  TabList,
  Tabs,
  Textarea,
} from "@/components/ui";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

type FieldType = "signature" | "date" | "initials" | "text" | "select";

type PlacedField = {
  id: string;
  pageNumber: number; // 0-indexed
  x: number; // 0-1
  y: number; // 0-1
  width: number; // 0-1
  height: number; // 0-1
  type: FieldType;
  label?: string;
  signerOrder: number;
  assignedTo?: string;
};

const fieldTypeLabels: Record<FieldType, string> = {
  signature: "Sign Here",
  date: "Date",
  initials: "Initials",
  text: "Text",
  select: "Select",
};

const fieldTypeColors: Record<FieldType, { border: string; bg: string; text: string }> = {
  signature: {
    border: "border-badge-warning-icon-color",
    bg: "bg-badge-warning-background",
    text: "text-badge-warning-text",
  },
  date: {
    border: "border-badge-blue-icon-color",
    bg: "bg-badge-blue-background",
    text: "text-badge-blue-text",
  },
  initials: {
    border: "border-badge-purple-icon-color",
    bg: "bg-badge-purple-background",
    text: "text-badge-purple-text",
  },
  text: {
    border: "border-badge-success-icon-color",
    bg: "bg-badge-success-background",
    text: "text-badge-success-text",
  },
  select: {
    border: "border-badge-cyan-icon-color",
    bg: "bg-badge-cyan-background",
    text: "text-badge-cyan-text",
  },
};

const defaultFieldSizes: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 0.25, height: 0.06 },
  date: { width: 0.18, height: 0.035 },
  initials: { width: 0.1, height: 0.05 },
  text: { width: 0.25, height: 0.035 },
  select: { width: 0.25, height: 0.035 },
};

interface SignatureFieldPlacerProps {
  documentId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function SignatureFieldPlacer({
  documentId,
  onClose,
  onSaved,
}: SignatureFieldPlacerProps) {
  const [fields, setFields] = useState<PlacedField[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeFieldType, setActiveFieldType] = useState<FieldType>("signature");
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  // Load existing fields using the admin document endpoint
  useEffect(() => {
    (async () => {
      try {
        const doc = await apiFetch<{
          signatureFields?: {
            id: string;
            pageNumber: number;
            x: number;
            y: number;
            width: number;
            height: number;
            type?: string;
            label?: string;
            signerOrder?: number;
            assignedTo?: string;
          }[];
        }>(`/documents/${documentId}`);
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
      } catch {
        // No existing fields — this is fine for new documents
      }
    })();
  }, [documentId]);

  // Close on Escape (unless editing a field)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingFieldId) {
          setEditingFieldId(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, editingFieldId]);

  const handlePageClick = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
      pageNumber: number,
      dimensions: { width: number; height: number },
    ) => {
      // Don't place if clicking on existing field
      if ((e.target as HTMLElement).closest("[data-field]")) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const sizes = defaultFieldSizes[activeFieldType];

      const normX = Math.max(0, Math.min(1 - sizes.width, clickX / dimensions.width));
      const normY = Math.max(0, Math.min(1 - sizes.height, clickY / dimensions.height));

      const newField: PlacedField = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        pageNumber: pageNumber - 1, // convert to 0-indexed
        x: normX,
        y: normY,
        width: sizes.width,
        height: sizes.height,
        type: activeFieldType,
        signerOrder: 0,
      };

      setFields((prev) => [...prev, newField]);

      // Auto-open options editor for select fields
      if (activeFieldType === "select") {
        setEditingFieldId(newField.id);
        setEditingLabel("");
      }
    },
    [activeFieldType],
  );

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDragStart = useCallback(
    (e: React.PointerEvent, fieldId: string, dimensions: { width: number; height: number }) => {
      const field = fields.find((f) => f.id === fieldId);
      if (!field) return;
      const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
      const offsetX = e.clientX - rect.left - field.x * dimensions.width;
      const offsetY = e.clientY - rect.top - field.y * dimensions.height;
      setDragging({ id: fieldId, offsetX, offsetY });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [fields],
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent, dimensions: { width: number; height: number }) => {
      if (!dragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const field = fields.find((f) => f.id === dragging.id);
      if (!field) return;

      const newX = Math.max(0, Math.min(1 - field.width, (e.clientX - rect.left - dragging.offsetX) / dimensions.width));
      const newY = Math.max(0, Math.min(1 - field.height, (e.clientY - rect.top - dragging.offsetY) / dimensions.height));

      setFields((prev) =>
        prev.map((f) => (f.id === dragging.id ? { ...f, x: newX, y: newY } : f)),
      );
    },
    [dragging, fields],
  );

  const handleDragEnd = useCallback(() => {
    setDragging(null);
  }, []);

  const handleSave = async () => {
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
      setLoadError(err instanceof Error ? err.message : "Failed to save signature fields");
    } finally {
      setSaving(false);
    }
  };

  const pdfUrl = `${API_URL}/api/documents/${documentId}/view`;
  const fieldTypes: FieldType[] = ["signature", "date", "initials", "text", "select"];
  const editingField = fields.find((f) => f.id === editingFieldId);
  const editingIsSelect = editingField?.type === "select";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background-gray-secondary_alt_2">
      {/* Header — title, save action and close */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b-[0.5px] border-card-border bg-card-background px-4 py-3.5 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base leading-6 font-semibold tracking-[-0.2px] text-text-primary">
            Place Fields
          </h2>
          <p className="mt-0.5 text-sm leading-5 text-text-tertiary">
            Select a field type and click on the document to place it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="gray">
            {fields.length} field{fields.length !== 1 ? "s" : ""} placed
          </Badge>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || fields.length === 0}
          >
            {saving ? "Saving..." : "Save Fields"}
          </Button>
          <Button
            appearance="ghost"
            size="sm"
            iconOnly
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="shrink-0 border-b border-card-border bg-card-background px-4 py-3 sm:px-6">
          <Alert status="error">{loadError}</Alert>
        </div>
      )}

      {/* Field type selector */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-card-border bg-background-gray-primary px-4 py-2.5 sm:px-6">
        <span className="text-xs font-medium text-text-tertiary">Field type:</span>
        <Tabs
          value={activeFieldType}
          onValueChange={(value) => setActiveFieldType(value as FieldType)}
          variant="pill"
          className="w-fit"
        >
          <TabList>
            {fieldTypes.map((type) => {
              const colors = fieldTypeColors[type];
              return (
                <Tab
                  key={type}
                  value={type}
                  icon={
                    <span
                      aria-hidden
                      className={cn("size-1.5 shrink-0 rounded-full bg-current", colors.text)}
                    />
                  }
                >
                  {fieldTypeLabels[type]}
                </Tab>
              );
            })}
          </TabList>
        </Tabs>
      </div>

      {/* Field label/options edit modal */}
      <Modal
        open={!!editingFieldId}
        onClose={() => setEditingFieldId(null)}
        size="sm"
      >
        <ModalHeader
          className="pr-14"
          title={editingIsSelect ? "Configure Options" : "Configure Field"}
        />
        <ModalBody>
          <Field
            label={editingIsSelect ? "Options (one per line)" : "Label"}
            description={
              editingIsSelect
                ? "Enter each option on a separate line. The signer will choose one."
                : undefined
            }
          >
            {editingIsSelect ? (
              <Textarea
                value={editingLabel}
                onChange={(e) => setEditingLabel(e.target.value)}
                placeholder={"Option A\nOption B\nOption C"}
                rows={5}
                className="resize-none"
                autoFocus
              />
            ) : (
              <Input
                type="text"
                value={editingLabel}
                onChange={(e) => setEditingLabel(e.target.value)}
                placeholder="Field label"
                autoFocus
              />
            )}
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button appearance="outline" onClick={() => setEditingFieldId(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const label = editingIsSelect
                ? editingLabel.split("\n").map((l) => l.trim()).filter(Boolean).join(",")
                : editingLabel.trim();
              setFields((prev) =>
                prev.map((f) =>
                  f.id === editingFieldId ? { ...f, label: label || undefined } : f,
                ),
              );
              setEditingFieldId(null);
            }}
          >
            Save
          </Button>
        </ModalFooter>
      </Modal>

      {/* PDF area — neutral document surface on a muted well */}
      <div className="min-h-0 flex-1 overflow-auto bg-background-gray-primary p-4 sm:p-5">
        <PdfViewer
          url={pdfUrl}
          overlay={(pageNumber, dimensions) => (
            <div
              className="absolute inset-0"
              style={{ cursor: dragging ? "grabbing" : "crosshair" }}
              onClick={(e) => {
                if (!dragging) handlePageClick(e, pageNumber, dimensions);
              }}
              onPointerMove={(e) => handleDragMove(e, dimensions)}
              onPointerUp={handleDragEnd}
            >
              {fields
                .filter((f) => f.pageNumber === pageNumber - 1)
                .map((field) => {
                  const colors = fieldTypeColors[field.type];
                  return (
                    <div
                      key={field.id}
                      data-field
                      className={cn(
                        "absolute flex items-center justify-center rounded border-2 border-dashed select-none",
                        colors.border,
                        colors.bg,
                      )}
                      style={{
                        left: `${field.x * 100}%`,
                        top: `${field.y * 100}%`,
                        width: `${field.width * 100}%`,
                        height: `${field.height * 100}%`,
                        cursor: dragging?.id === field.id ? "grabbing" : "grab",
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handleDragStart(e, field.id, dimensions);
                      }}
                    >
                      <span className={cn("text-xs font-medium whitespace-nowrap", colors.text)}>
                        {fieldTypeLabels[field.type]}
                        {field.signerOrder > 0 && (
                          <span className="ml-1 text-[10px] opacity-70">#{field.signerOrder}</span>
                        )}
                      </span>
                      {/* Edit button for select/text fields to configure label/options */}
                      {(field.type === "select" || field.type === "text") && (
                        <button
                          type="button"
                          className="absolute -top-2 -left-2 flex size-5 cursor-pointer items-center justify-center rounded-full bg-button-primary-background text-white-100 transition-colors hover:bg-button-primary-hover-background"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFieldId(field.id);
                            setEditingLabel(field.label || "");
                          }}
                          title="Edit options"
                        >
                          <Pencil className="size-2.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Remove field"
                        className="absolute -top-2 -right-2 flex size-5 cursor-pointer items-center justify-center rounded-full bg-button-error-background text-white-100 transition-colors hover:bg-button-error-hover-background"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeField(field.id);
                        }}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        />
      </div>
    </div>
  );
}
