import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, PackagePlus, Repeat2, UserRound } from "lucide-react-native";
import { colors, radii, spacing } from "../../theme";
import { isRTL, t } from "../../i18n";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";

/**
 * Native adaptation of the web `Hero` — a branded, full-bleed panel that opens the
 * home tab. The background (deep navy + a soft accent tint on the leading side +
 * a faint swap motif) is composed from plain Views, so it is light, RTL-aware and
 * safe on the New Architecture (no SVG fill-on-Fabric issues). A restrained
 * entrance (fade + rise) runs once and is skipped when Reduce Motion is on.
 */
export function HomeHero({ isAuthenticated }: { isAuthenticated: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!mounted) return;
      if (reduce) return anim.setValue(1);
      Animated.timing(anim, { toValue: 1, duration: 460, delay: 40, useNativeDriver: true }).start();
    });
    return () => {
      mounted = false;
    };
  }, [anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const goAdd = () => router.push(isAuthenticated ? "/new-listing" : "/login");

  return (
    <View style={styles.wrap}>
      {/* soft accent tint (leading top corner) — a layered stand-in for the web glow */}
      <View style={[styles.glowOuter, isRTL ? styles.glowStart : styles.glowEnd]} pointerEvents="none" />
      <View style={[styles.glowInner, isRTL ? styles.glowStart : styles.glowEnd]} pointerEvents="none" />
      {/* faint swap motif watermark on the trailing/bottom side */}
      <View style={[styles.motif, isRTL ? styles.motifStart : styles.motifEnd]} pointerEvents="none">
        <Icon icon={Repeat2} size={200} color={colors.green} />
      </View>

      <View style={[styles.content, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.topRow}>
          <Text style={styles.wordmark} accessibilityRole="header">
            Just<Text style={styles.wordmarkAccent}>Swap</Text>
          </Text>
          <Pressable
            onPress={() => router.push("/profile")}
            accessibilityRole="button"
            accessibilityLabel={t("mobile.profile.signIn")}
            hitSlop={8}
            style={({ pressed }) => [styles.accountBtn, pressed && styles.pressed]}
          >
            <Icon icon={UserRound} size={20} color={colors.text} />
          </Pressable>
        </View>

        <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
          <View style={styles.badge}>
            <Icon icon={Repeat2} size={14} color={colors.green} />
            <Text style={styles.badgeText}>{t("home.heroBadge")}</Text>
          </View>
          <Text style={styles.title}>{t("home.heroTitle")}</Text>
          <Text style={styles.subtitle}>{t("home.heroSubtitle")}</Text>
          <View style={styles.ctas}>
            <Button
              label={t("home.cta")}
              onPress={goAdd}
              leftIcon={<Icon icon={PackagePlus} size={18} color={colors.navy} />}
              fullWidth
            />
            <Button
              label={t("home.browseCategories")}
              variant="secondary"
              onPress={() => router.push("/browse")}
              leftIcon={<Icon icon={ArrowRight} size={18} color={colors.text} mirror />}
              fullWidth
            />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: colors.navy },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  wordmark: { color: colors.white, fontSize: 22, fontWeight: "800", letterSpacing: 0.2 },
  wordmarkAccent: { color: colors.green },
  accountBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: "rgba(24,182,106,0.35)",
  },
  badgeText: { color: colors.green, fontSize: 12, fontWeight: "700" },
  title: { color: colors.text, fontSize: 30, fontWeight: "800", lineHeight: 38, marginTop: spacing.md },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 23, marginTop: spacing.sm },
  ctas: { gap: spacing.sm, marginTop: spacing.lg },
  // Layered translucent discs approximate a soft accent glow (no blur needed).
  glowOuter: { position: "absolute", top: -150, width: 400, height: 400, borderRadius: 200, backgroundColor: "rgba(24,182,106,0.06)" },
  glowInner: { position: "absolute", top: -120, width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(24,182,106,0.09)" },
  glowEnd: { right: -110 },
  glowStart: { left: -110 },
  motif: { position: "absolute", bottom: -46, opacity: 0.05 },
  motifEnd: { right: -30 },
  motifStart: { left: -30 },
});
