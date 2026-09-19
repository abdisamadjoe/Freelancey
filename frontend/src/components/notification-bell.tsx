"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Shared notification state — ensures a single polling interval even when
// multiple <NotificationBell /> instances are mounted (desktop + mobile).
// ---------------------------------------------------------------------------

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (v: number | ((prev: number) => number)) => void;
}

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      apiFetch<{ count: number }>("/notifications/unread-count")
        .then((res) => setUnreadCount(res.count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  data: Notification[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// NotificationBell component
// ---------------------------------------------------------------------------

export function NotificationBell({ align = "right" }: { align?: "left" | "right" } = {}) {
  const ctx = useContext(NotificationContext);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fallback local state if used outside provider (shouldn't happen, but safe)
  const [localCount, setLocalCount] = useState(0);
  const unreadCount = ctx?.unreadCount ?? localCount;
  const setUnreadCount = ctx?.setUnreadCount ?? setLocalCount;

  // Check push subscription status
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushSubscribed(!!sub))
      .catch(() => {});
  }, []);

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    apiFetch<PaginatedResponse>("/notifications?limit=10")
      .then((res) => setNotifications(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifications();
  };

  const handleClick = (n: Notification) => {
    if (!n.read) {
      apiFetch(`/notifications/${n.id}/read`, { method: "PATCH" }).catch(
        () => {},
      );
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
      );
      setUnreadCount((c: number) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleMarkAllRead = () => {
    apiFetch("/notifications/read-all", { method: "PATCH" }).catch(() => {});
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
  };

  const handleEnablePush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const { publicKey } = await apiFetch<{ publicKey: string }>(
        "/push/vapid-key",
      );
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });
      const sub = subscription.toJSON();
      await apiFetch("/push/subscribe", {
        method: "POST",
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
        }),
      });
      setPushSubscribed(true);
    } catch {
      // User denied or something went wrong
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="relative flex size-9 items-center justify-center rounded-lg text-icon-tertiary transition-colors hover:bg-background-gray-secondary hover:text-text-primary"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-semibold text-white ring-2 ring-card-surface-area">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-[calc(100%+6px)] z-50 flex max-h-96 w-80 flex-col overflow-hidden rounded-xl border border-card-border bg-dropdowns-background shadow-lg ${align === "left" ? "left-0" : "right-0"}`}
          role="menu"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-card-border px-4 py-3">
            <span className="text-sm font-semibold text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-neutral-brand-color hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-text-tertiary">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto mb-2 size-5 text-icon-tertiary" aria-hidden />
                <p className="text-sm text-text-tertiary">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-2.5 border-b border-border-primary px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-background-gray-secondary_alt ${
                    !n.read ? "bg-background-gray-primary" : ""
                  }`}
                  role="menuitem"
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${!n.read ? "bg-brand-500" : "bg-transparent"}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">
                      {n.title}
                    </span>
                    <span className="block truncate text-xs text-text-tertiary">{n.message}</span>
                    <span className="mt-0.5 block text-xs text-text-tertiary">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Footer — push opt-in */}
          {typeof window !== "undefined" && "PushManager" in window && !pushSubscribed && (
            <div className="border-t border-card-border px-4 py-2.5">
              <button
                onClick={handleEnablePush}
                className="w-full text-center text-xs font-medium text-neutral-brand-color hover:underline"
              >
                Enable push notifications
              </button>
            </div>
          )}
          {pushSubscribed && (
            <div className="border-t border-card-border px-4 py-2.5 text-center">
              <span className="text-xs text-text-tertiary">Push notifications enabled</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
