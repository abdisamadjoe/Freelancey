"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-modal";
import { Plus, Pencil, Trash2, Check, X, Tag } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  Input,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
  TableRowSkeleton,
} from "@/components/ui";
import { ColorPatchGrid, PRESET_COLORS } from "@/components/color-patch-grid";

interface Label {
  id: string;
  name: string;
  color: string;
}

export function LabelsSection() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(PRESET_COLORS[0].hex);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const { success, error: showError } = useToast();
  const confirm = useConfirm();

  const loadLabels = () => {
    apiFetch<Label[]>("/labels")
      .then((data) => {
        setLabels(data);
        setLoading(false);
      })
      .catch((err) => {
        showError(err instanceof Error ? err.message : "Failed to load labels");
        setLoading(false);
      });
  };

  useEffect(() => {
    loadLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      await apiFetch("/labels", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      setNewName("");
      setNewColor(PRESET_COLORS[0].hex);
      success("Label created");
      loadLabels();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create label");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (label: Label) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await apiFetch(`/labels/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      setEditingId(null);
      success("Label updated");
      loadLabels();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update label");
    }
  };

  const handleDelete = async (label: Label) => {
    const ok = await confirm({
      title: "Delete Label",
      message: `Delete "${label.name}"? It will be removed from all assigned items.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/labels/${label.id}`, { method: "DELETE" });
      success("Label deleted");
      loadLabels();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete label");
    }
  };

  if (loading) {
    return (
      <Card className="overflow-hidden p-0">
        <TableRowSkeleton columns={2} />
        <TableRowSkeleton columns={2} />
        <TableRowSkeleton columns={2} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create form */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="size-7 shrink-0 rounded-full border-[0.5px] border-card-border"
            style={{ backgroundColor: newColor }}
            aria-hidden
          />
          <Input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New label name"
            maxLength={50}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            className="w-full min-w-40 flex-1"
          />
          <Button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            loading={creating}
          >
            <Plus aria-hidden />
            Add
          </Button>
        </div>
        <ColorPatchGrid value={newColor} onChange={setNewColor} />
      </Card>

      {/* Labels list */}
      {labels.length === 0 ? (
        <EmptyState
          icon={<Tag className="size-5" aria-hidden />}
          title="No labels yet"
          description="Create a label above to tag and organize projects, tasks, files, and clients."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <TableRoot>
            <TableHeader className="bg-background-gray-secondary_alt">
              <TableRow>
                <TableHead className="text-xs font-semibold text-text-secondary">Label</TableHead>
                <TableHead className="w-28 text-xs font-semibold text-text-secondary">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labels.map((label) => (
                <TableRow key={label.id}>
                  {editingId === label.id ? (
                    <TableCell colSpan={2}>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="size-5 shrink-0 rounded-full border-[0.5px] border-card-border"
                            style={{ backgroundColor: editColor }}
                            aria-hidden
                          />
                          <Input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={50}
                            className="w-full max-w-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit();
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <Button
                            type="button"
                            variant="success"
                            appearance="ghost"
                            size="sm"
                            iconOnly
                            title="Save label"
                            onClick={handleSaveEdit}
                          >
                            <Check aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            appearance="ghost"
                            size="sm"
                            iconOnly
                            title="Cancel"
                            onClick={() => setEditingId(null)}
                          >
                            <X aria-hidden />
                          </Button>
                        </div>
                        <ColorPatchGrid value={editColor} onChange={setEditColor} />
                      </div>
                    </TableCell>
                  ) : (
                    <>
                      <TableCell>
                        <span className="flex items-center gap-2.5">
                          <span
                            className="size-4 shrink-0 rounded-full border-[0.5px] border-card-border"
                            style={{ backgroundColor: label.color }}
                            aria-hidden
                          />
                          <span className="truncate text-sm text-text-primary">{label.name}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            appearance="ghost"
                            size="sm"
                            iconOnly
                            title="Edit label"
                            onClick={() => handleEdit(label)}
                          >
                            <Pencil aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            appearance="ghost"
                            size="sm"
                            iconOnly
                            title="Remove label"
                            onClick={() => handleDelete(label)}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </span>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </TableRoot>
        </Card>
      )}
    </div>
  );
}
