'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { formatShortDate } from '@/lib/format';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        unreadCount: number;
        items: NotificationItem[];
      };
      setUnreadCount(data.unreadCount);
      setItems(data.items);
    } catch {
      // silent background fetch
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    const timer = setInterval(() => {
      void loadNotifications();
    }, 30_000);
    return () => clearInterval(timer);
  }, [userId, loadNotifications]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  async function markAllRead() {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount);
        setItems(data.items);
      }
    } catch {
      // ignore
    }
  }

  async function handleSelect(item: NotificationItem) {
    setOpen(false);
    if (!item.readAt) {
      void fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notificationId: item.id }),
      }).then(() => loadNotifications());
    }
    router.push(item.href);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void loadNotifications();
        }}
        className="relative rounded-xl border border-ink-200 bg-white p-2 text-ink-700 transition hover:bg-ink-50 hover:text-ink-950"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-extrabold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-ink-200 bg-white p-3 shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-ink-100 pb-2">
            <p className="text-xs font-extrabold text-ink-950">
              Notifications {unreadCount > 0 ? `(${unreadCount} unread)` : ''}
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="mt-2 max-h-80 space-y-1.5 overflow-y-auto">
            {items.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-500">
                No notifications yet.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleSelect(n)}
                  className={`w-full rounded-xl p-2.5 text-left transition ${
                    n.readAt
                      ? 'bg-white hover:bg-ink-50'
                      : 'border border-brand-200 bg-brand-50/40 hover:bg-brand-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-ink-950">{n.title}</p>
                    <span className="shrink-0 text-[10px] text-ink-400">
                      {formatShortDate(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-600">
                    {n.body}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
