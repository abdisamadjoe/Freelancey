"use client";

import { ActionButton, Empty, fmtDateTime, Loading, TextAreaInput } from "@/components/app/kit";
import { Button } from "@/components/tailgrids/core/button";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface CommentRecord {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
}

/** Comment thread on an update or a task. */
export function CommentsSection({
  targetType,
  targetId,
  commentCount: initialCount,
  alwaysExpanded = false,
}: {
  targetType: "update" | "task";
  targetId: string;
  commentCount: number;
  alwaysExpanded?: boolean;
}) {
  const session = useSession();
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(alwaysExpanded);
  const [count, setCount] = useState(initialCount);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const canDeleteOthers = session.member.role === "owner" || session.member.role === "admin";

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const loadComments = useCallback(() => {
    setLoading(true);
    apiFetch<{ data: CommentRecord[]; meta: { total: number } }>(`/comments/${targetType}/${targetId}?limit=50`)
      .then((res) => {
        setComments(res.data);
        setCount(res.meta.total);
        setLoaded(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetType, targetId]);

  useEffect(() => {
    if (expanded && !loaded) loadComments();
  }, [expanded, loaded, loadComments]);

  const post = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await apiFetch(`/comments/${targetType}/${targetId}`, { method: "POST", body: JSON.stringify({ content: newComment }) });
      setNewComment("");
      loadComments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await apiFetch(`/comments/${id}`, { method: "DELETE" });
      loadComments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete comment");
    }
  };

  return (
    <div className="space-y-3">
      {!alwaysExpanded && (
        <Button size="sm" variant="ghost" onPress={() => setExpanded((v) => !v)}>
          {count > 0 ? `${count} comment${count === 1 ? "" : "s"}` : "Comment"}
        </Button>
      )}
      {expanded && (
        <div className="space-y-3">
          {loading && !loaded ? (
            <Loading />
          ) : comments.length === 0 ? (
            <Empty>No comments yet.</Empty>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg border border-card-border p-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-text-tertiary">
                    <span className="font-medium text-text-secondary">{c.author.name}</span>
                    <span>{fmtDateTime(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-text-primary">{c.content}</p>
                  {(c.author.id === session.user.id || canDeleteOthers) && (
                    <Button size="xs" variant="danger" appearance="ghost" onPress={() => remove(c.id)}>
                      Delete
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <TextAreaInput rows={2} value={newComment} onChange={setNewComment} placeholder="Write a comment..." />
          <ActionButton size="sm" variant="primary" loading={posting} isDisabled={!newComment.trim()} onPress={post}>
            Post comment
          </ActionButton>
        </div>
      )}
    </div>
  );
}
