import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../src/theme";
import { t } from "../../src/i18n";

// Emoji tab icons for the M1 shell (zero-dependency). Swapping to
// @expo/vector-icons is a small follow-up.
const ICONS: Record<string, string> = {
  index: "🏠",
  browse: "🔍",
  messages: "💬",
  notifications: "🔔",
  profile: "👤",
};

export default function TabsLayout() {
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
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{ICONS[route.name] ?? "•"}</Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: t("mobile.tab.home") }} />
      <Tabs.Screen name="browse" options={{ title: t("mobile.tab.browse") }} />
      <Tabs.Screen name="messages" options={{ title: t("mobile.tab.messages") }} />
      <Tabs.Screen name="notifications" options={{ title: t("mobile.tab.notifications") }} />
      <Tabs.Screen name="profile" options={{ title: t("mobile.tab.profile") }} />
    </Tabs>
  );
}
