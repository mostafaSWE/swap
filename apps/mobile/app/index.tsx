import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CATEGORIES, SLOGAN, APP_NAME } from "@swap/config";
import { localizedName } from "@swap/ui";
import { colors, radii, spacing } from "../src/theme";

/**
 * Mobile home skeleton. Proves the shared packages (@swap/config, @swap/ui,
 * @swap/types) work on native and uses the same design tokens as web.
 *
 * This is intentionally a SKELETON (Phase 1). Full mobile screens come later;
 * they will reuse @swap/api query functions exactly like the web app does.
 */
export default function Home() {
  const locale = "ar" as const;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.slogan}>{SLOGAN[locale]}</Text>
        <Text style={styles.sloganEn}>{SLOGAN.en}</Text>
      </View>

      <Text style={styles.sectionTitle}>التصنيفات</Text>
      <View style={styles.grid}>
        {CATEGORIES.map((cat) => (
          <View key={cat.id} style={styles.chip}>
            <Text style={styles.chipText}>{localizedName(cat, locale)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        Mobile skeleton — shares types, theme tokens, country/city/category
        constants, and the API client with the web app.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  brand: { color: colors.green, fontSize: 28, fontWeight: "800" },
  slogan: { color: colors.white, fontSize: 18, fontWeight: "700", textAlign: "right" },
  sloganEn: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.greenLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipText: { color: colors.greenDark, fontWeight: "600" },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
