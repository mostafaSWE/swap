import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, PackagePlus, Repeat2, UserRound } from "lucide-react-native";
import { colors, radii, spacing } from "../../theme";
import { t } from "../../i18n";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { HeaderBell } from "../HeaderBell";
import { BrandBackdrop } from "../BrandBackground";
import { Reveal } from "../motion";

/**
 * Native adaptation of the web `Hero` — the branded panel that opens the home tab.
 * It shares the SAME premium treatment as the auth shell / sign-in gate by rendering
 * the reusable `BrandBackdrop` (breathing emerald glow PNG + faint ink grid + a slowly
 * rotating swap motif) clipped to just the hero block (never the feed below). The
 * headline / badge / subtitle / CTAs enter with a staggered `Reveal` (the native
 * counterpart of the web hero's `Stagger`). All motion is Reduce-Motion gated & RTL-aware.
 */
export function HomeHero() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [heroH, setHeroH] = useState(460);

  // /new-listing self-guards (signed-out → the shared sign-in gate), so route uniformly.
  const goAdd = () => router.push("/new-listing");

  return (
    <View style={styles.wrap} onLayout={(e) => setHeroH(e.nativeEvent.layout.height)}>
      <BrandBackdrop height={heroH} motifSize={200} glowSize={480} />

      <View style={[styles.content, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.topRow}>
          <Text style={styles.wordmark} accessibilityRole="header">
            Just<Text style={styles.wordmarkAccent}>Swap</Text>
          </Text>
          <View style={styles.headerActions}>
            <HeaderBell color={colors.white} />
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
        </View>

        {/* Staggered entrance — the native counterpart of the web hero's <Stagger>. */}
        <Reveal delay={60}>
          <View style={styles.badge}>
            <Icon icon={Repeat2} size={14} color={colors.green} />
            <Text style={styles.badgeText}>{t("home.heroBadge")}</Text>
          </View>
        </Reveal>
        <Reveal delay={120} style={styles.titleReveal}>
          <Text style={styles.title}>{t("home.heroTitle")}</Text>
        </Reveal>
        <Reveal delay={180} style={styles.subtitleReveal}>
          <Text style={styles.subtitle}>{t("home.heroSubtitle")}</Text>
        </Reveal>
        <Reveal delay={240} style={styles.ctas}>
          <Button
            label={t("home.cta")}
            onPress={goAdd}
            leftIcon={<Icon icon={PackagePlus} size={18} color={colors.navy} />}
            pill
            fullWidth
          />
          <Button
            label={t("home.browseCategories")}
            variant="secondary"
            onPress={() => router.push("/categories")}
            leftIcon={<Icon icon={ArrowRight} size={18} color={colors.text} mirror />}
            fullWidth
          />
        </Reveal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: colors.navy },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
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
  titleReveal: { marginTop: spacing.md },
  title: { color: colors.text, fontSize: 30, fontWeight: "800", lineHeight: 38 },
  subtitleReveal: { marginTop: spacing.sm },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 23 },
  ctas: { gap: spacing.sm, marginTop: spacing.lg },
});
