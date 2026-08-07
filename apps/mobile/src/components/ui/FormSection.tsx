import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../theme";

/**
 * Grouped-form section — the native counterpart of the web register form's
 * `<fieldset>`/`<legend>` grouping (Personal information / Location / Contact /
 * Security). An uppercase faint label with a trailing hairline, then the fields.
 * RTL-safe: the header row is `flexDirection:row` and the hairline uses flex.
 */
export function FormSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.rule} />
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: colors.textFaint },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  body: { gap: spacing.md },
});
