import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Bell, Home, MessageCircle, Search, UserRound } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { getUnreadNotificationCount, subscribeToNotifications } from "@swap/api";
import { colors } from "../../src/theme";
import { t } from "../../src/i18n";
import { supabase } from "../../src/lib/supabase";
import { Icon } from "../../src/components/ui/Icon";

const ICONS: Record<string, LucideIcon> = {
  index: Home,
  browse: Search,
  messages: MessageCircle,
  notifications: Bell,
  profile: UserRound,
};

export default function TabsLayout() {
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
      const refresh = () => getUnreadNotificationCount(supabase, userId).then((count) => active && setUnread(count)).catch(() => undefined);
      refresh();
      unsubscribe = subscribeToNotifications(supabase, userId, refresh);
    }
    void start();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUnread(0);
      if (session) void getUnreadNotificationCount(supabase, session.user.id).then((count) => active && setUnread(count)).catch(() => undefined);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
      unsubscribe?.();
    };
  }, []);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "700" },
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color }) => <Icon icon={ICONS[route.name] ?? Home} size={24} color={color as string} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: t("mobile.tab.home"), headerShown: false }} />
      <Tabs.Screen name="browse" options={{ title: t("mobile.tab.browse") }} />
      <Tabs.Screen name="messages" options={{ title: t("mobile.tab.messages") }} />
      <Tabs.Screen name="notifications" options={{ title: t("mobile.tab.notifications"), tabBarBadge: unread || undefined, tabBarBadgeStyle: { backgroundColor: colors.green, color: colors.navy, fontWeight: "800" } }} />
      <Tabs.Screen name="profile" options={{ title: t("mobile.tab.profile") }} />
    </Tabs>
  );
}
