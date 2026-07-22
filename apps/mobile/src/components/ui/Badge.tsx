import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "../../theme";

export type BadgeTone = "neutral" | "positive" | "warning" | "danger" | "info" | "special";

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.elevated, fg: colors.textMuted },
  positive: { bg: colors.greenLight, fg: colors.green },
  warning: { bg: "rgba(245,158,11,0.16)", fg: colors.warning },
  danger: { bg: "rgba(239,68,68,0.16)", fg: colors.danger },
  info: { bg: "rgba(59,130,246,0.16)", fg: colors.info },
  special: { bg: "rgba(139,92,246,0.16)", fg: "#A78BFA" },
};

/** Colored pill (web `StatusBadge`/`ProposalStatusBadge`/`SwapCountBadge`/`RatingBadge`).
 *  Row is `flexDirection:row` → auto-flips in RTL. */
export function Badge({
  label,
  tone = "neutral",
  icon,
  style,
}: {
  label: string;
  tone?: BadgeTone;
  icon?: ReactNode;
  style?: ViewStyle;
}) {
  const c = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      {icon}
      <Text style={[styles.label, { color: c.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Swap-proposal lifecycle status → badge tone (mirrors web ProposalStatusBadge). */
export const PROPOSAL_STATUS_TONE: Record<string, BadgeTone> = {
  pending: "warning",
  countered: "info",
  agreed: "positive",
  awaiting_confirmation: "special",
  completed: "positive",
  disputed: "danger",
  cancelled: "neutral",
};

/** Generic listing/report status → tone. */
export const STATUS_TONE: Record<string, BadgeTone> = {
  active: "positive",
  pending: "warning",
  hidden: "neutral",
  removed: "danger",
  resolved: "positive",
  rejected: "danger",
  reviewed: "info",
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  label: { fontSize: 12, fontWeight: "700" },
});
