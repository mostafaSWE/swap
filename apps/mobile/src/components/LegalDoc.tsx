import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LifeBuoy } from "lucide-react-native";
import { t } from "../i18n";
import { colors, radii, spacing } from "../theme";
import { Button, Icon } from "./ui";

/** A content section of a policy page. `body` = paragraphs, `list` = bullet points. */
export type LegalSection = { heading: string; body?: string[]; list?: string[] };

/**
 * Shared renderer for every mobile legal / policy screen (Terms, Safety, Privacy).
 * Mirrors the web `LegalHero` + `LegalArticle`: branded hero (eyebrow/title/subtitle
 * + "last updated" pill), the single-sourced `*.sections` catalog, an optional
 * `extra` slot, and a "still need help → Contact support" footer. The web's sticky
 * "on this page" TOC is intentionally omitted (web hides it below `lg`, so it never
 * shows at phone width). RTL-safe: rows auto-flip, bullets use `paddingStart`.
 */
export function LegalDoc({
  eyebrow,
  title,
  subtitle,
  updated,
  sections,
  extra,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  updated?: string;
  sections: LegalSection[];
  extra?: ReactNode;
}) {
  const router = useRouter();
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {updated ? (
        <View style={styles.pill}>
          <Text style={styles.pillText}>{updated}</Text>
        </View>
      ) : null}

      {sections.map((section, i) => (
        <View key={i} style={styles.section}>
          <Text style={styles.heading} accessibilityRole="header">{section.heading}</Text>
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

      {extra ? <View style={styles.extra}>{extra}</View> : null}

      {/* Still need help → Contact support (web's HelpCTA) */}
      <View style={styles.help}>
        <Text style={styles.helpTitle} accessibilityRole="header">{t("legalCommon.helpTitle")}</Text>
        <Text style={styles.helpBody}>{t("legalCommon.helpBody")}</Text>
        <Button
          label={t("legalCommon.helpCta")}
          onPress={() => router.push("/support")}
          fullWidth
          leftIcon={<Icon icon={LifeBuoy} size={18} color={colors.navy} />}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing["3xl"] },
  eyebrow: { color: colors.green, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  pill: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  pillText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  section: { gap: 6, marginTop: spacing.md },
  heading: { color: colors.text, fontSize: 16, fontWeight: "800" },
  para: { color: colors.text, fontSize: 14, lineHeight: 22 },
  bulletRow: { flexDirection: "row", gap: spacing.sm, paddingStart: spacing.sm },
  bullet: { color: colors.green, fontSize: 14, lineHeight: 22 },
  bulletText: { color: colors.text, fontSize: 14, lineHeight: 22, flex: 1 },
  extra: { marginTop: spacing.lg, gap: spacing.sm },
  help: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: "rgba(24,182,106,0.20)",
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  helpTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  helpBody: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
});
