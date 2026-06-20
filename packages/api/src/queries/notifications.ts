import type { Notification, NotificationWithActor } from "@swap/types";
import type { SwapClient } from "../client";

/**
 * In-app notifications (spec §3.7). Created by DB triggers; the recipient reads
 * and marks them read directly via RLS (owner-only), the same way chat unread
 * counts and message read-flags already work — no backend round-trip needed.
 */

const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, username, avatar_url, bio, country_id, city_id, followers_count, following_count, listings_count, completed_swaps_count, rating, ratings_count, created_at";

/** The current user's notifications, newest first, each with its actor's profile. */
export async function getNotifications(
  supabase: SwapClient,
  userId: string,
  limit = 20,
): Promise<NotificationWithActor[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(`*, actor:profiles!notifications_actor_id_fkey(${PUBLIC_PROFILE_COLUMNS})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<NotificationWithActor[]>();
  if (error) throw error;
  return data ?? [];
}

/** How many unread notifications the user has (for the bell badge). */
export async function getUnreadNotificationCount(
  supabase: SwapClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

/** Mark all of the user's unread notifications as read (RLS: owner-only update). */
export async function markAllNotificationsRead(
  supabase: SwapClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}

/**
 * Subscribe to changes to a user's notifications via Supabase Realtime.
 * Listens for INSERT *and* UPDATE: a busy chat thread collapses repeat unread
 * notices into one row via ON CONFLICT DO UPDATE (migration 0008), so without
 * the UPDATE listener the bell would miss every message after the first.
 */
export function subscribeToNotifications(
  supabase: SwapClient,
  userId: string,
  onChange: (notification: Notification) => void,
) {
  const filter = `user_id=eq.${userId}`;
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter },
      (payload) => onChange(payload.new as Notification),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "notifications", filter },
      (payload) => onChange(payload.new as Notification),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
