import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { colors, spacing } from "../src/theme";
import { t, tList } from "../src/i18n";

type Section = { heading: string; body?: string[]; list?: string[] };

/**
 * Terms of Service viewer (web `/terms`). Renders the SAME shared
 * `terms.sections` catalog the web uses — the legal copy is single-sourced, never
 * re-authored on mobile. Linked from the Support screen and the terms-acceptance
 * gate ("Read the full Terms").
 */
export default function TermsScreen() {
  const sections = tList<Section>("terms.sections");
  return (
    <>
      <Stack.Screen options={{ title: t("terms.title") }} />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>{t("terms.eyebrow")}</Text>
        <Text style={styles.title}>{t("terms.title")}</Text>
        <Text style={styles.subtitle}>{t("terms.subtitle")}</Text>
        <Text style={styles.updated}>{t("terms.updated")}</Text>
        {sections.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            {(section.body ?? []).map((para, j) => (
              <Text key={j} style={styles.para}>{para}</Text>
            ))}
            {(section.list ?? []).map((li, j) => (
              <View key={j} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{li}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing["3xl"] },
  eyebrow: { color: colors.green, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  updated: { color: colors.textFaint, fontSize: 12, marginBottom: spacing.sm },
  section: { gap: 6, marginTop: spacing.md },
  heading: { color: colors.text, fontSize: 16, fontWeight: "800" },
  para: { color: colors.text, fontSize: 14, lineHeight: 22 },
  bulletRow: { flexDirection: "row", gap: spacing.sm, paddingStart: spacing.sm },
  bullet: { color: colors.green, fontSize: 14, lineHeight: 22 },
  bulletText: { color: colors.text, fontSize: 14, lineHeight: 22, flex: 1 },
});
