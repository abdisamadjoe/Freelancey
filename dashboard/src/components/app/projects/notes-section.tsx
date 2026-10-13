"use client";

import { ActionButton, Empty, fmtDateTime, Loading, PagerRow, type Paginated, Panel, TextAreaInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { useApi } from "@/lib/query";
import { useState } from "react";
import { toast } from "sonner";

interface NoteRecord {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
}

/** Internal notes on a project. Never visible to clients. */
export function NotesSection({ projectId, isArchived }: { projectId: string; isArchived: boolean }) {
  const [page, setPage] = useState(1);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const notes = useApi<Paginated<NoteRecord>>(`/notes?projectId=${projectId}&page=${page}&limit=20`);

  async function add() {
    if (!content.trim()) return;
    setPosting(true);
    try {
      await apiFetch(`/notes?projectId=${projectId}`, { method: "POST", body: JSON.stringify({ content }) });
      setContent("");
      await notes.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add the note");
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this note?")) return;
    try {
      await apiFetch(`/notes/${id}`, { method: "DELETE" });
      await notes.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the note");
    }
  }

  return (
    <>
      {!isArchived && (
        <Panel title="Internal notes" description="Only your team can see these.">
          <div className="space-y-3">
            <TextAreaInput rows={3} value={content} onChange={setContent} placeholder="Write a note..." />
            <ActionButton variant="primary" loading={posting} isDisabled={!content.trim()} onPress={add}>
              Add note
            </ActionButton>
          </div>
        </Panel>
      )}

      <Panel>
        {notes.isLoading ? (
          <Loading />
        ) : (notes.data?.data.length ?? 0) === 0 ? (
          <Empty>No notes yet.</Empty>
        ) : (
          <ul className="divide-y divide-card-border">
            {notes.data!.data.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm whitespace-pre-wrap text-text-primary">{n.content}</p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    {n.author.name} · {fmtDateTime(n.createdAt)}
                  </p>
                </div>
                {!isArchived && (
                  <Button size="sm" variant="danger" appearance="ghost" onPress={() => remove(n.id)}>
                    Delete
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <PagerRow page={page} totalPages={notes.data?.meta.totalPages ?? 1} onPageChange={setPage} />
        </div>
      </Panel>
    </>
  );
}
