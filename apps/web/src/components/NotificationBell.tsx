"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  subscribeToNotifications,
} from "@swap/api";
import { formatRelativeTime } from "@swap/ui";
import type { Locale, NotificationWithActor } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "./ProfileAvatar";

/**
 * Notification center (spec §3.7). Live bell + dropdown panel. Reads the current
 * user's notifications directly via RLS, badges the unread count, and stays live
 * via Realtime. Opening the panel marks everything read (server-side) and clears
 * the badge, while keeping this view's unread highlights until the next refetch.
 * Renders nothing for a signed-out visitor.
 */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const tn = useTranslations("nav");
  const locale = useLocale() as Locale;
  const supabase = useRef(createClient());

  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationWithActor[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Resolve the signed-in user once, then load + subscribe.
  useEffect(() => {
    let active = true;
    const sb = supabase.current;
    sb.auth.getUser().then(({ data }) => {
      if (!active) return;
      const id = data.user?.id ?? null;
      setUserId(id);
      if (!id) return;
      const refresh = () => {
        getNotifications(sb, id).then(setItems).catch(() => {});
        getUnreadNotificationCount(sb, id).then(setUnread).catch(() => {});
      };
      refresh();
      cleanupRef.current = subscribeToNotifications(sb, id, refresh);
    });
    return () => {
      active = false;
      cleanupRef.current?.();
    };
  }, []);

  // Close the panel when clicking outside it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0 && userId) {
      // Mark read server-side + clear the badge; keep this view's highlights.
      setUnread(0);
      markAllNotificationsRead(supabase.current, userId).catch(() => {});
    }
  }

  if (!userId) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={tn("notifications")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="notification-panel"
        className="relative rounded-full p-1 text-ink transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Bell className="h-6 w-6" aria-hidden />
        {unread > 0 ? (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-night">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id="notification-panel"
          role="region"
          aria-labelledby="notification-panel-title"
          className="animate-fade-in absolute end-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-line bg-surface shadow-elevated"
        >
          <div className="border-b border-line px-4 py-3">
            <h2 id="notification-panel-title" className="text-sm font-bold text-ink">
              {t("title")}
            </h2>
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Bell className="h-8 w-8 text-muted" aria-hidden />
              <p className="text-sm text-muted">{t("empty")}</p>
            </div>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
              {items.map((n) => (
                <NotificationRow key={n.id} n={n} locale={locale} t={t} onNavigate={() => setOpen(false)} />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NotificationRow({
  n,
  locale,
  t,
  onNavigate,
}: {
  n: NotificationWithActor;
  locale: Locale;
  t: ReturnType<typeof useTranslations>;
  onNavigate: () => void;
}) {
  const name = n.actor?.full_name ?? t("someone");
  // Route by type first: a rating shows on YOUR profile (received reviews); a
  // new follower opens THEIR profile; everything else opens the swap conversation.
  const href =
    n.type === "new_rating"
      ? "/profile"
      : n.type === "new_follower" && n.actor
        ? `/users/${n.actor.username}`
        : n.conversation_id
          ? `/messages/${n.conversation_id}`
          : "/profile";

  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn(
          "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-canvas",
          !n.is_read && "bg-swap-tint/40",
        )}
      >
        <ProfileAvatar src={n.actor?.avatar_url} name={name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink">{t(`type.${n.type}`, { name })}</p>
          <span className="text-xs text-muted">{formatRelativeTime(n.created_at, locale)}</span>
        </div>
        {!n.is_read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-swap" aria-hidden /> : null}
      </Link>
    </li>
  );
}
