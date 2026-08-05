import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { supabase } from "../lib/supabase";
import { configurePushHandler, pushTarget, registerForPush, revokePush } from "../lib/push";

/**
 * Wires push into the app lifecycle (M5): configures the foreground handler,
 * registers the device token after login and on sign-in, revokes it on sign-out,
 * and routes a notification tap to its target (the destination re-checks auth).
 * Renders nothing. Mounted once, high in the tree.
 *
 * NOTE: importing `expo-notifications` requires the native module — only present in
 * an EAS build that includes it (not the pre-M5 dev client).
 */
export function PushManager() {
  const router = useRouter();

  useEffect(() => {
    configurePushHandler();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void registerForPush();
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) void registerForPush();
      if (event === "SIGNED_OUT") void revokePush();
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = pushTarget(response.notification.request.content.data as Record<string, unknown>);
      if (target) router.push(target as never);
    });

    return () => {
      subscription.unsubscribe();
      responseSub.remove();
    };
  }, [router]);

  return null;
}
