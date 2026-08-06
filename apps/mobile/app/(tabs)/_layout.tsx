import { StyleSheet, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Home, MessageCircle, Plus, Search, UserRound } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, radii } from "../../src/theme";
import { t } from "../../src/i18n";
import { supabase } from "../../src/lib/supabase";
import { Icon } from "../../src/components/ui/Icon";
import { HeaderBell } from "../../src/components/HeaderBell";

const ICONS: Record<string, LucideIcon> = {
  index: Home,
  browse: Search,
  messages: MessageCircle,
  profile: UserRound,
};

/**
 * Bottom navigation (M7 batch 2) — a native adaptation of the website's mobile nav:
 * Home / Browse / **Add** (prominent green center action) / Messages / Profile, with
 * notifications lifted OUT of the tab bar into a consistent header **bell** (exactly
 * like the responsive website).
 *
 * Deliberately built on the STOCK expo-router `<Tabs>` bar (green active tint, lucide
 * icons via the `Icon` wrapper, a `tabPress` listener for Add, `headerRight` for the
 * bell). A fully custom `tabBar`/`header` was tried and reproducibly crashes this
 * Fabric/New-Arch build natively (Hermes render throw, no redbox) — the stock chrome
 * is the stable path, so the reassessment is delivered through supported options only.
 */
export default function TabsLayout() {
  const router = useRouter();

  async function onAddPress() {
    const { data } = await supabase.auth.getSession();
    router.push(data.session ? "/new-listing" : "/login");
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "800", fontSize: 20 },
        headerShadowVisible: false,
        headerRight: () => (
          <View style={styles.headerRight}>
            <HeaderBell color={colors.white} />
          </View>
        ),
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
      <Tabs.Screen
        name="add"
        options={{
          title: t("newListing.title"),
          headerShown: false,
          tabBarLabel: () => null,
          // Screen readers get the action name (the visible label is hidden).
          tabBarAccessibilityLabel: t("newListing.title"),
          // A raised green disc in the stock tabBarIcon slot — reads as a FAB without
          // a custom tab bar (which native-crashes this Fabric build). `focused` is
          // ignored: the tabPress listener prevents default, so Add never selects.
          tabBarIcon: ({ focused }) => (
            <View style={[styles.addFab, focused && styles.addFabPressed]}>
              <Icon icon={Plus} size={26} color={colors.navy} />
            </View>
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            void onAddPress();
          },
        })}
      />
      <Tabs.Screen name="messages" options={{ title: t("mobile.tab.messages") }} />
      <Tabs.Screen name="profile" options={{ title: t("mobile.tab.profile") }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRight: { marginEnd: 8 },
  // Prominent green center action. Rendered inside the stock tabBarIcon slot (a plain
  // View + Icon — the safe render path), so it reads as a raised FAB without a custom bar.
  addFab: {
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    marginTop: -8,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.background,
    shadowColor: colors.green,
    shadowOpacity: 0.4,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  addFabPressed: { opacity: 0.85, transform: [{ scale: 0.94 }] },
});
