import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Home, MessageCircle, Plus, Search, UserRound } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, radii } from "../../src/theme";
import { t } from "../../src/i18n";
import { Icon } from "../../src/components/ui/Icon";
import { HeaderBell } from "../../src/components/HeaderBell";
import { useReduceMotion } from "../../src/components/motion";

const ICONS: Record<string, LucideIcon> = {
  index: Home,
  browse: Search,
  messages: MessageCircle,
  profile: UserRound,
};

/**
 * The center Add action — a floating/docked FAB rendered inside the stock `tabBarIcon`
 * slot (a custom `tabBar` native-crashes this Fabric build). A green disc sits in a
 * `colors.background`-colored "socket" ring: the ring matches the scene canvas (so the
 * disc reads as floating) but recesses against the lighter `surface` bar (so it reads as
 * a notch carved out of the bar — the requested "cut its roundings out of the nav bar").
 * A translucent inner highlight ring + an emerald glow give depth; a gentle breathing
 * pulse (Reduce-Motion gated, transform-only/native-driver) draws the eye. `pointerEvents`
 * is off so taps fall through to the real tab button (the `tabPress` listener opens Add).
 */
function AddFabIcon() {
  const reduce = useReduceMotion();
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, reduce]);
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  return (
    <View style={styles.addFabSocket} pointerEvents="none">
      <Animated.View style={[styles.addFab, { transform: [{ scale }] }]}>
        <View style={styles.addFabInner} pointerEvents="none" />
        <Plus size={28} color={colors.navy} strokeWidth={2.6} />
      </Animated.View>
    </View>
  );
}

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

  // The /new-listing route self-guards (signed-out → a polished sign-in gate),
  // so every Add entry point routes there uniformly.
  function onAddPress() {
    router.push("/new-listing");
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        // Seamless header — same token as the screen body (no navy-on-near-black seam).
        headerStyle: { backgroundColor: colors.background },
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
          // A floating/docked FAB in the stock tabBarIcon slot (a custom tab bar
          // native-crashes this Fabric build). See AddFabIcon. `focused` is unused:
          // the tabPress listener prevents default, so Add never selects.
          tabBarIcon: () => <AddFabIcon />,
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
  // Background-colored socket ring: matches the canvas (disc floats) but recesses against
  // the lighter surface bar (reads as a notch). Lifted so most of the disc floats above it.
  addFabSocket: {
    width: 66,
    height: 66,
    borderRadius: radii.pill,
    marginTop: -18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  addFab: {
    width: 54,
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.green,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 12,
  },
  // translucent inner highlight ring — a subtle glass rim for depth
  addFabInner: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, margin: 3, borderRadius: radii.pill, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.28)" },
});
