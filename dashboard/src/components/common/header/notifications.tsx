"use client";

import {
  BellIcon,
  CreditCardIcon,
  LetterIcon,
  } from "@/components/common/header/icons";
import { Button } from "@/components/tailgrids/core/button";
import { OverlayWrapper } from "@/components/tailgrids/core/overlay";
import { Popover } from "@/components/tailgrids/core/popover";
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/tailgrids/core/scroll-area";
import { apiFetch } from "@/lib/api";
import { type Notification as AppNotification, timeAgo, useNotificationCount, usePushSubscription } from "@/lib/notifications";
import { cn } from "@/utils/cn";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import { Header, Heading } from "react-aria-components";

interface Notification {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp: string;
  isUnread?: boolean;
  link: string | null;
}

/** Payments and invoices get the card icon; everything else the letter icon. */
function iconFor(type: string): React.ReactNode {
  return /invoice|payment/i.test(type) ? <CreditCardIcon /> : <LetterIcon />;
}

/** Groups notifications under Today, Yesterday and Earlier, newest first. */
function groupByDay(rows: AppNotification[]): { title: string; items: Notification[] }[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 24 * 60 * 60 * 1000;
  const groups: Record<string, Notification[]> = { Today: [], Yesterday: [], Earlier: [] };
  for (const n of rows) {
    const created = new Date(n.createdAt).getTime();
    const key = created >= startOfToday.getTime() ? "Today" : created >= startOfToday.getTime() - day ? "Yesterday" : "Earlier";
    groups[key].push({
      id: n.id,
      icon: iconFor(n.type),
      title: n.title,
      description: n.message,
      timestamp: timeAgo(n.createdAt),
      isUnread: !n.read,
      link: n.link,
    });
  }
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([title, items]) => ({ title, items }));
}

export function NotificationsButton() {
  const router = useRouter();
  const { unreadCount, setUnreadCount } = useNotificationCount();
  const push = usePushSubscription();
  const [notifications, setNotifications] = useState<{ title: string; items: Notification[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<{ data: AppNotification[] }>("/notifications?limit=10")
      .then((res) => setNotifications(groupByDay(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) load();
  };

  const handleMarkAsRead = (notification: Notification) => {
    if (notification.isUnread) {
      apiFetch(`/notifications/${notification.id}/read`, { method: "PATCH" }).catch(() => {});
      setNotifications((prev) =>
        prev.map((group) => ({
          ...group,
          items: group.items.map((item) => (item.id === notification.id ? { ...item, isUnread: false } : item)),
        })),
      );
      setUnreadCount((c: number) => Math.max(0, c - 1));
    }
    setIsOpen(false);
    if (notification.link) router.push(notification.link);
  };

  const handleMarkAllAsRead = () => {
    apiFetch("/notifications/read-all", { method: "PATCH" }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, items: n.items.map((i) => ({ ...i, isUnread: false })) })));
    setUnreadCount(0);
  };

  return (
    <OverlayWrapper isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Button
        iconOnly
        appearance="outline"
        className="relative size-10 rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs focus-visible:border-input-primary-focus-border focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 [&>svg]:size-auto"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className={cn("absolute top-2 right-2.75 z-1 size-2 rounded-full bg-red-400")}>
            <span className="absolute inset-0 -z-1 animate-ping rounded-full bg-red-400 opacity-75" />
          </span>
        )}
      </Button>

      <Popover
        placement="bottom end"
        className="w-84.5 overflow-hidden rounded-2xl border border-border-secondary-alt bg-background-white-secondary p-0 shadow-3xl"
      >
        {/* Header */}
        <Header className="flex items-center justify-between border-b border-border-secondary-alt px-5 pt-5 pb-4">
          <Heading level={4} className="leading-6 font-semibold text-text-primary">
            Notifications
          </Heading>

        </Header>

        <ScrollArea className="h-100 max-h-100">
          <ScrollAreaViewport>
            {notifications.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-text-tertiary">
                {loading ? "Loading…" : "No notifications yet"}
              </p>
            )}
            {notifications.map((group) => (
              <section key={group.title}>
                {/* Group Header */}
                <div className="border-t border-b border-border-primary bg-background-gray-secondary px-5 py-2">
                  <p className="text-xs leading-4 text-text-tertiary uppercase">{group.title}</p>
                </div>
                {/* Notifications List */}
                <ul className="flex-1 overflow-y-auto px-3 py-2">
                  {group.items.map((notification) => (
                    <li key={notification.id}>
                      <button
                        className="group flex w-full cursor-pointer gap-3.5 rounded-lg px-3 py-3 transition-colors duration-300 hover:bg-background-gray-secondary_alt"
                        onClick={() => handleMarkAsRead(notification)}
                      >
                        {/* Icon */}
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-secondary bg-background-gray-primary text-icon-secondary transition-all duration-300 group-hover:bg-brand-500 group-hover:text-base-white group-hover:shadow-[0_1px_3px_0.5px_rgba(13,13,18,0.08)]">
                          {notification.icon}
                        </span>

                        {/* Content */}
                        <div className="min-w-0 flex-1 text-start">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm leading-5 font-semibold text-text-primary">
                              {notification.title}
                            </p>

                            {notification.isUnread && (
                              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                            )}
                          </div>

                          <p className="mt-1 line-clamp-2 text-xs leading-4 text-text-secondary">
                            {notification.description}
                          </p>
                          <p className="mt-2 text-xs leading-4 text-text-tertiary">
                            {notification.timestamp}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </ScrollAreaViewport>
          <ScrollBar />
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-secondary-alt px-5 py-4">
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs font-medium text-text-secondary underline transition-colors hover:text-text-primary"
          >
            Mark all as read
          </button>
          {push.supported &&
            (push.pushSubscribed ? (
              <span className="text-xs text-text-tertiary">Push enabled</span>
            ) : (
              <Button variant="primary" size="sm" className="bg-brand-500 py-1.5" onClick={push.enable}>
                Enable push
              </Button>
            ))}
        </div>
      </Popover>
    </OverlayWrapper>
  );
}
