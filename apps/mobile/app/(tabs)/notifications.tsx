import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { getNotifications, markAllNotificationsRead, subscribeToNotifications } from "@swap/api";
import type { NotificationWithActor } from "@swap/types";
import { supabase } from "../../src/lib/supabase";
import { timeAgo } from "../../src/lib/format";
import { locale, t } from "../../src/i18n";
import { colors, radii, spacing } from "../../src/theme";
import { Avatar } from "../../src/components/ui";
import { EmptyState } from "../../src/components/EmptyState";
import { Screen } from "../../src/components/Screen";

type Sess = { user: { id: string } } | null;

/** Native counterpart to the web's live notification bell panel. The tab clears
 * unread state on focus; rows route to the same profile/conversation targets. */
export default function Notifications() {
  const router = useRouter();
  const [session, setSession] = useState<Sess | undefined>(undefined);
  const [items, setItems] = useState<NotificationWithActor[] | null>(null);

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
  const refresh = useCallback(() => {
    if (!userId) {
      setItems(null);
      return;
    }
    getNotifications(supabase, userId).then(setItems).catch(() => setItems([]));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
    return subscribeToNotifications(supabase, userId, refresh);
  }, [userId, refresh]);

  useFocusEffect(
    useCallback(() => {
      if (userId) void markAllNotificationsRead(supabase, userId).catch(() => undefined);
    }, [userId]),
  );

  // A notification tab can already be focused while a user finishes signing
  // in. React Navigation does not always replay the focus callback for that
  // session transition, so also clear on the first resolved user id.
  useEffect(() => {
    if (userId) void markAllNotificationsRead(supabase, userId).catch(() => undefined);
  }, [userId]);

  if (session === undefined || (session && items === null)) return <View style={styles.center}><ActivityIndicator color={colors.green} /></View>;
  if (!session) return <Screen><EmptyState icon="🔔" title={t("mobile.profile.signInPrompt")} /></Screen>;
  if (!items?.length) return <Screen><EmptyState icon="🔔" title={t("notifications.empty")} /></Screen>;

  return (
    <FlatList
      style={styles.root}
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <NotificationRow item={item} onPress={() => navigate(item)} />}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      contentContainerStyle={styles.list}
    />
  );

  function navigate(notification: NotificationWithActor) {
    if (notification.type === "new_rating") router.push("/(tabs)/profile");
    else if (notification.type === "new_follower" && notification.actor) router.push({ pathname: "/users/[username]", params: { username: notification.actor.username } });
    else if (notification.conversation_id) router.push({ pathname: "/messages/[id]", params: { id: notification.conversation_id } });
    else router.push("/(tabs)/profile");
  }
}

function NotificationRow({ item, onPress }: { item: NotificationWithActor; onPress: () => void }) {
  const name = item.actor?.full_name ?? t("notifications.someone");
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !item.is_read && styles.unread, pressed && styles.pressed]} accessibilityRole="button">
      <Avatar uri={item.actor?.avatar_url} name={name} size="sm" />
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  unread: { backgroundColor: colors.greenLight },
  pressed: { opacity: 0.75 },
  body: { flex: 1, gap: 3 },
  message: { color: colors.text, fontSize: 14, lineHeight: 20 },
  time: { color: colors.textFaint, fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.green, marginTop: spacing.xs },
  sep: { height: 1, backgroundColor: colors.border },
});
