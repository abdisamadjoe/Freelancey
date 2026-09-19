"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { linkify } from "@/lib/linkify";
import { Avatar, Button, EmptyState, FieldError, Input, Skeleton } from "@/components/ui";

interface CommentRecord {
  id: string;
  content: string;
  author: { id: string; name: string };
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// Cache session per page load — keyed by userId to avoid stale data across logins.
// The cache is invalidated on full page reload (module re-evaluation).
let sessionCache: { userId: string; role: string } | null = null;
let sessionPromise: Promise<{ userId: string; role: string } | null> | null = null;

function useSession() {
  const [session, setSession] = useState(sessionCache);
  useEffect(() => {
    if (sessionCache) {
      setSession(sessionCache);
      return;
    }
    if (!sessionPromise) {
      sessionPromise = apiFetch<{ user: { id: string }; member?: { role: string } }>("/organizations/me")
        .then((s) => {
          sessionCache = { userId: s.user.id, role: s.member?.role || "member" };
          return sessionCache;
        })
        .catch(() => {
          sessionPromise = null;
          return null;
        });
    }
    sessionPromise.then((s) => {
      if (s) setSession(s);
    });
  }, []);
  return session;
}

/** Call this on logout to clear cached session data. */
export function clearCommentsSessionCache() {
  sessionCache = null;
  sessionPromise = null;
}

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

  const canDeleteOthers = session?.role === "owner" || session?.role === "admin";

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  const loadComments = useCallback(() => {
    setLoading(true);
    apiFetch<PaginatedResponse<CommentRecord>>(
      `/comments/${targetType}/${targetId}?limit=50`,
    )
      .then((res) => {
        setComments(res.data);
        setCount(res.meta.total);
        setLoaded(true);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [targetType, targetId]);

  useEffect(() => {
    if (expanded && !loaded) {
      loadComments();
    }
  }, [expanded, loaded, loadComments]);

  const [error, setError] = useState("");

  const handlePost = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    setError("");
    try {
      await apiFetch(`/comments/${targetType}/${targetId}`, {
        method: "POST",
        body: JSON.stringify({ content: newComment }),
      });
      setNewComment("");
      loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setError("");
    try {
      await apiFetch(`/comments/${commentId}`, { method: "DELETE" });
      loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
    }
  };

  return (
    <div className={alwaysExpanded ? "" : "mt-2"}>
      {!alwaysExpanded && (
        <Button
          variant="ghost"
          appearance="ghost"
          size="xs"
          onClick={() => setExpanded(!expanded)}
          data-testid={`comments-toggle-${targetId}`}
          className="text-text-tertiary hover:text-text-primary"
        >
          <MessageSquare />
          {expanded
            ? "Hide comments"
            : count > 0
              ? `${count} comment${count !== 1 ? "s" : ""}`
              : "Reply"}
        </Button>
      )}

      {expanded && (
        <div className="mt-2 space-y-2" data-testid={`comments-list-${targetId}`}>
          {loading && comments.length === 0 ? (
            <div className="space-y-2">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg bg-background-gray-primary px-3.5 py-3"
                >
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-2.5 w-32" />
                    <Skeleton className="mt-2 h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <EmptyState
              variant="plain"
              icon={<MessageSquare className="size-5" aria-hidden />}
              title="No comments yet"
              className="px-4 py-6"
            />
          ) : null}

          {comments.map((comment) => (
            <div
              key={comment.id}
              data-testid="comment-entry"
              className="group flex items-start gap-3 rounded-lg bg-background-gray-primary px-3.5 py-3 transition-colors hover:bg-background-gray-secondary_alt"
            >
              <Avatar name={comment.author.name} size={28} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-text-primary">
                    {comment.author.name}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-5 break-words whitespace-pre-wrap text-text-secondary">
                  {linkify(comment.content)}
                </p>
              </div>
              {(comment.author.id === session?.userId || canDeleteOthers) && (
                <Button
                  variant="ghost"
                  appearance="ghost"
                  size="xs"
                  iconOnly
                  onClick={() => handleDelete(comment.id)}
                  data-testid={`delete-comment-${comment.id}`}
                  title="Delete comment"
                  aria-label="Delete comment"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}

          <FieldError>{error}</FieldError>

          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handlePost();
                }
              }}
              placeholder="Write a comment..."
              maxLength={2000}
              data-testid="comment-input"
              className="flex-1 text-sm"
            />
            <Button
              onClick={handlePost}
              disabled={posting || !newComment.trim()}
              data-testid="comment-submit"
              size="sm"
              iconOnly
              title="Post comment"
              aria-label="Post comment"
              className="shrink-0"
            >
              <Send />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
