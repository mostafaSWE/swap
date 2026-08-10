import { useRef, type ReactNode } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "../../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  pill,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  /** Fully-rounded pill (web `.btn-primary` is `rounded-pill`). Opt-in — base stays radii.md. */
  pill?: boolean;
  style?: ViewStyle;
}) {
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;
  // Smooth spring press-scale (user-driven direct-manipulation feedback — allowed
  // under reduced-motion). Transform-only, native driver.
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to: number, bounciness = 0) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 50, bounciness }).start();
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => !isDisabled && press(0.96)}
      onPressOut={() => press(1, 6)}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        v.container,
        pill && styles.pill,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
        { transform: [{ scale }] },
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
    </AnimatedPressable>
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
  pill: { borderRadius: radii.pill },
  fullWidth: { alignSelf: "stretch" },
  disabled: { opacity: 0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { fontSize: 15, fontWeight: "700" },
});
