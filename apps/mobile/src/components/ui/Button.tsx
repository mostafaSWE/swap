import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "../../theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

/** Primary action button (web `CTAButton` / `.btn-*`). RTL-safe: the icon+label
 *  row is `flexDirection:row`, which RN auto-flips under `I18nManager.isRTL`. */
export function Button({
  label,
  onPress,
  variant = "primary",
  fullWidth,
  loading,
  disabled,
  leftIcon,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  style?: ViewStyle;
}) {
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        v.container,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} size="small" />
      ) : (
        <View style={styles.row}>
          {leftIcon}
          <Text style={[styles.label, v.text]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { container: ViewStyle; text: { color: string } }> = {
  primary: { container: { backgroundColor: colors.green }, text: { color: colors.navy } },
  secondary: {
    container: { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border },
    text: { color: colors.text },
  },
  ghost: { container: { backgroundColor: "transparent" }, text: { color: colors.text } },
  danger: {
    container: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.danger },
    text: { color: colors.danger },
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  fullWidth: { alignSelf: "stretch" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { fontSize: 15, fontWeight: "700" },
});
