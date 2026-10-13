"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
} from "react";
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

/** Shared unread count (one polling interval for every bell on screen). */
export function useNotificationCount() {
  const ctx = useContext(NotificationContext);
  const [localCount, setLocalCount] = useState(0);
  return {
    unreadCount: ctx?.unreadCount ?? localCount,
    setUnreadCount: ctx?.setUnreadCount ?? setLocalCount,
  };
}

/** Web-push opt-in: whether this browser is subscribed, and how to subscribe. */
export function usePushSubscription() {
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const supported = typeof window !== "undefined" && "PushManager" in window;

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushSubscribed(!!sub))
      .catch(() => {});
  }, []);

  const enable = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const { publicKey } = await apiFetch<{ publicKey: string }>("/push/vapid-key");
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });
      const sub = subscription.toJSON();
      await apiFetch("/push/subscribe", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys }) });
      setPushSubscribed(true);
    } catch {
      // The user declined, or the browser refused.
    }
  };

  return { supported, pushSubscribed, enable };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function timeAgo(dateStr: string): string {
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
