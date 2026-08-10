import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getNotifications, markAllNotificationsRead, subscribeToNotifications } from "@swap/api";
import type { NotificationWithActor } from "@swap/types";
import {
  ArrowLeftRight, Bell, CircleCheckBig, MessageCircle, Repeat2, Star, TriangleAlert, UserPlus, type LucideIcon,
} from "lucide-react-native";
import { supabase } from "../src/lib/supabase";
import { timeAgo } from "../src/lib/format";
import { locale, t } from "../src/i18n";
import { colors, radii, spacing } from "../src/theme";
import { Avatar } from "../src/components/ui";
import { Icon } from "../src/components/ui/Icon";
import { Skeleton } from "../src/components/ui/Skeleton";
import { EmptyState } from "../src/components/EmptyState";
import { ErrorState } from "../src/components/ErrorState";
import { Screen } from "../src/components/Screen";
import { SignInGate } from "../src/components/SignInGate";

type Sess = { user: { id: string } } | null;

/** Per-type accent icon shown as a small badge on the actor avatar. */
const TYPE_ICON: Record<string, LucideIcon> = {
  proposal_received: Repeat2,
  proposal_countered: ArrowLeftRight,
  proposal_accepted: CircleCheckBig,
  swap_confirm_pending: CircleCheckBig,
  swap_completed: CircleCheckBig,
  swap_disputed: TriangleAlert,
  proposal_cancelled: ArrowLeftRight,
  new_message: MessageCircle,
  new_follower: UserPlus,
  new_rating: Star,
};

/** Notifications — reached from the header bell (not a bottom tab, matching the web).
 * Clears unread on focus; rows route to the same profile/conversation targets. */
export default function Notifications() {
  const router = useRouter();
  const [session, setSession] = useState<Sess | undefined>(undefined);
  const [items, setItems] = useState<NotificationWithActor[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setItems(null);
      setSession(next);
    });
    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const refresh = useCallback(async () => {
    if (!userId) {
      setItems(null);
      return;
    }
    setError(false);
    try {
      setItems(await getNotifications(supabase, userId));
    } catch {
      setError(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refresh();
    return subscribeToNotifications(supabase, userId, () => void refresh());
  }, [userId, refresh]);

  useFocusEffect(
    useCallback(() => {
      if (userId) void markAllNotificationsRead(supabase, userId).catch(() => undefined);
    }, [userId]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (session === undefined || (userId && items === null && !error)) {
    return (
      <View style={styles.skeletonWrap}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.skelRow}>
            <Skeleton width={40} height={40} radius={radii.pill} />
            <View style={styles.skelBody}>
              <Skeleton width="80%" height={13} />
              <Skeleton width="35%" height={11} />
            </View>
          </View>
        ))}
      </View>
    );
  }
  if (!session) return <SignInGate icon={Bell} title={t("notifications.signInTitle")} body={t("notifications.signInBody")} next="/notifications" />;
  if (error) return <View style={styles.center}><ErrorState onRetry={refresh} /></View>;
  if (!items?.length) return <Screen><EmptyState icon={<Icon icon={Bell} size={26} color={colors.green} />} title={t("notifications.empty")} /></Screen>;

  return (
    <FlatList
      style={styles.root}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <NotificationRow item={item} onPress={() => navigate(item)} />}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} colors={[colors.green]} />}
      showsVerticalScrollIndicator={false}
    />
  );

  function navigate(notification: NotificationWithActor) {
    if (notification.type === "new_rating") router.push("/profile");
    else if (notification.type === "new_follower" && notification.actor) router.push({ pathname: "/users/[username]", params: { username: notification.actor.username } });
    else if (notification.conversation_id) router.push({ pathname: "/messages/[id]", params: { id: notification.conversation_id } });
    else router.push("/profile");
  }
}

function NotificationRow({ item, onPress }: { item: NotificationWithActor; onPress: () => void }) {
  const name = item.actor?.full_name ?? t("notifications.someone");
  const typeIcon = TYPE_ICON[item.type] ?? Bell;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !item.is_read && styles.unread, pressed && styles.pressed]} accessibilityRole="button">
      <View>
        <Avatar uri={item.actor?.avatar_url} name={name} size="sm" />
        <View style={styles.typeBadge}>
          <Icon icon={typeIcon} size={11} color={colors.navy} />
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.message}>{t(`notifications.type.${item.type}`, { name })}</Text>
        <Text style={styles.time}>{timeAgo(item.created_at, locale)}</Text>
      </View>
      {!item.is_read ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { paddingVertical: spacing.xs },
  center: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, justifyContent: "center" },
  skeletonWrap: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  skelRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  skelBody: { flex: 1, gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  unread: { backgroundColor: colors.greenLight },
  pressed: { opacity: 0.75 },
  typeBadge: {
    position: "absolute",
    bottom: -2,
    end: -2,
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  body: { flex: 1, gap: 3 },
  message: { color: colors.text, fontSize: 14, lineHeight: 20 },
  time: { color: colors.textFaint, fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.green, marginTop: spacing.xs },
  sep: { height: 1, backgroundColor: colors.border },
});
