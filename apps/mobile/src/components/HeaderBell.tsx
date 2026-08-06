import { useRouter } from "expo-router";
import { colors } from "../theme";
import { useUnreadCount } from "../lib/useUnreadCount";
import { NotificationBell } from "./NotificationBell";

/** Connected header notification control: live unread count + opens the
 *  notifications screen. Notifications are a header action, not a bottom tab. */
export function HeaderBell({ color = colors.text }: { color?: string }) {
  const router = useRouter();
  const unread = useUnreadCount();
  return <NotificationBell count={unread} color={color} onPress={() => router.push("/notifications")} />;
}
