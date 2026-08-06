import { useEffect, useState } from "react";
import { getUnreadNotificationCount, subscribeToNotifications } from "@swap/api";
import { supabase } from "./supabase";

/** Live unread-notification count for the signed-in user (0 when signed out).
 *  Extracted from the tab layout so the header bell + any surface can share it. */
export function useUnreadCount(): number {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    async function start() {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!active || !userId) {
        if (active) setUnread(0);
        return;
      }
      const refresh = () =>
        getUnreadNotificationCount(supabase, userId).then((c) => active && setUnread(c)).catch(() => undefined);
      refresh();
      unsubscribe = subscribeToNotifications(supabase, userId, refresh);
    }
    void start();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUnread(0);
      unsubscribe?.();
      unsubscribe = undefined;
      if (session) void start();
    });
    return () => {
      active = false;
      subscription.unsubscribe();
      unsubscribe?.();
    };
  }, []);

  return unread;
}
