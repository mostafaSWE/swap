import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

/** Empty-state card. `icon` may be an emoji string (legacy) OR a ReactNode such as
 *  a lucide `<Icon/>` (preferred). `action` renders a CTA below the copy. */
export function EmptyState({
  icon = "📭",
  title,
  subtitle,
  action,
}: {
  icon?: string | ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.root}>
      {typeof icon === "string" ? <Text style={styles.icon}>{icon}</Text> : <View style={styles.iconWrap}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    marginTop: spacing["2xl"],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: { fontSize: 40 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "700", textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19 },
  action: { marginTop: spacing.sm },
});
