"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { useConfirm } from "@/components/confirm-modal";
import { useToast } from "@/components/toast";
import { Pagination } from "@/components/pagination";
import { EyeOff, Trash2 } from "lucide-react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Textarea,
  UpdateItemSkeleton,
} from "@/components/ui";

interface NoteRecord {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function NotesSection({
  projectId,
  isArchived,
}: {
  projectId: string;
  isArchived: boolean;
}) {
  const confirm = useConfirm();
  const { success, error: showError } = useToast();
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadNotes = useCallback(() => {
    setLoading(true);
    apiFetch<PaginatedResponse<NoteRecord>>(
      `/notes/project/${projectId}?page=${page}&limit=10`,
    )
      .then((res) => {
        setNotes(res.data);
        setTotalPages(res.meta.totalPages);
        setLoadError(null);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err instanceof Error ? err.message : "Failed to load notes");
      })
      .finally(() => setLoading(false));
  }, [projectId, page]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    try {
      await apiFetch(`/notes?projectId=${projectId}`, {
        method: "POST",
        body: JSON.stringify({ content: newContent }),
      });
      setNewContent("");
      loadNotes();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to add note");
    }
  };

  const handleDelete = async (noteId: string) => {
    const ok = await confirm({
      title: "Delete Note",
      message: "Delete this note? This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await apiFetch(`/notes/${noteId}`, { method: "DELETE" });
      loadNotes();
      success("Note deleted");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  const showSkeleton = loading && notes.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Notes</CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            <EyeOff className="size-3.5" aria-hidden />
            Team only — not visible to clients
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isArchived && (
          <div className="space-y-3">
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Write an internal note..."
              rows={3}
            />
            <div className="flex justify-end">
              <Button onClick={handleAdd} disabled={!newContent.trim()}>
                Add Note
              </Button>
            </div>
          </div>
        )}

        {loadError ? (
          <Alert
            status="error"
            title="Could not load notes"
            actions={
              <Button appearance="outline" size="sm" onClick={() => loadNotes()}>
                Retry
              </Button>
            }
          >
            {loadError}
          </Alert>
        ) : showSkeleton ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <UpdateItemSkeleton key={index} />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            variant="plain"
            icon={<EyeOff className="size-5" aria-hidden />}
            title="No internal notes yet."
            className="py-8"
          />
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border-[0.5px] border-card-border bg-card-surface-area p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar name={note.author.name} size={24} />
                    <span className="truncate text-sm font-medium text-text-primary">
                      {note.author.name}
                    </span>
                    <span className="shrink-0 text-xs text-text-tertiary">
                      {formatRelativeTime(note.createdAt)}
                    </span>
                  </div>
                  {!isArchived && (
                    <Button
                      variant="danger"
                      appearance="ghost"
                      size="xs"
                      onClick={() => handleDelete(note.id)}
                      className="shrink-0"
                    >
                      <Trash2 />
                      Delete
                    </Button>
                  )}
                </div>
                <p className="mt-2.5 text-sm leading-6 whitespace-pre-wrap text-text-secondary">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </CardContent>
    </Card>
  );
}
