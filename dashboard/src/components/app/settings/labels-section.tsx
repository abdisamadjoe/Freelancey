"use client";

import { ActionButton, Empty, FormGrid, LabelChip, Loading, Panel, TextInput } from "@/components/app/kit";
import { ColorField, PRESET_COLORS } from "@/components/app/color-field";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Label {
  id: string;
  name: string;
  color: string;
}

export function LabelsSection() {
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(PRESET_COLORS[0].hex);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(PRESET_COLORS[0].hex);

  const load = useCallback(() => {
    apiFetch<Label[]>("/labels").then(setLabels).catch(() => setLabels([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!newName.trim()) return;
    try {
      await apiFetch("/labels", { method: "POST", body: JSON.stringify({ name: newName.trim(), color: newColor }) });
      setNewName("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create label");
    }
  }

  async function save() {
    if (!editingId || !editName.trim()) return;
    try {
      await apiFetch(`/labels/${editingId}`, { method: "PUT", body: JSON.stringify({ name: editName.trim(), color: editColor }) });
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update label");
    }
  }

  async function remove(label: Label) {
    if (!window.confirm(`Delete the label "${label.name}"? It is removed from everything it was applied to.`)) return;
    try {
      await apiFetch(`/labels/${label.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete label");
    }
  }

  return (
    <Panel title="Labels" description="Create labels to tag and organize projects, tasks, files, and clients.">
      <div className="space-y-5">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <FormGrid>
            <TextInput label="New label" value={newName} onChange={setNewName} placeholder="e.g. Priority" />
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-input-label-text">Colour</span>
              <ColorField value={newColor} onChange={setNewColor} />
            </div>
          </FormGrid>
          <ActionButton type="submit" variant="primary" isDisabled={!newName.trim()}>
            Add label
          </ActionButton>
        </form>

        {labels === null ? (
          <Loading />
        ) : labels.length === 0 ? (
          <Empty>No labels yet.</Empty>
        ) : (
          <ul className="divide-y divide-card-border">
            {labels.map((l) => (
              <li key={l.id} className="py-3">
                {editingId === l.id ? (
                  <div className="space-y-3">
                    <TextInput value={editName} onChange={setEditName} />
                    <ColorField value={editColor} onChange={setEditColor} />
                    <div className="flex gap-2">
                      <ActionButton size="sm" variant="primary" onPress={save}>
                        Save
                      </ActionButton>
                      <Button size="sm" appearance="outline" variant="primary" onPress={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <LabelChip name={l.name} color={l.color} />
                    <div className="flex gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        onPress={() => {
                          setEditingId(l.id);
                          setEditName(l.name);
                          setEditColor(l.color);
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="xs" variant="danger" appearance="ghost" onPress={() => remove(l)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
