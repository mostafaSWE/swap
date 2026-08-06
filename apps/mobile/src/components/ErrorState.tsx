import { StyleSheet, Text, View } from "react-native";
import { RotateCw, TriangleAlert } from "lucide-react-native";
import { colors, radii, spacing } from "../theme";
import { t } from "../i18n";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

/**
 * Standard error surface for a failed data load: a warning icon, a message and a
 * **Retry** action. Used in place of the silent `.catch(() => setItems([]))`
 * anti-pattern (which renders a real failure as a fake "empty"). Mirrors the web
 * error boundaries.
 */
export function ErrorState({
  title,
  subtitle,
  onRetry,
}: {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <Icon icon={TriangleAlert} size={26} color={colors.warning} />
      </View>
      <Text style={styles.title}>{title ?? t("common.error")}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {onRetry ? (
        <Button
          label={t("common.retry")}
          variant="secondary"
          onPress={onRetry}
          leftIcon={<Icon icon={RotateCw} size={16} color={colors.text} />}
        />
      ) : null}
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
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: "rgba(245,158,11,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "700", textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19 },
});
