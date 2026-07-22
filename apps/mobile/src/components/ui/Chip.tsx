import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radii, spacing } from "../../theme";

/** Tappable category/filter chip (web `CategoryPill`). */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.chip, active && styles.active, pressed && styles.pressed]}
    >
      <Text style={[styles.label, active && styles.activeLabel]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.greenLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  active: { backgroundColor: colors.green },
  pressed: { opacity: 0.85 },
  label: { color: colors.green, fontWeight: "600", fontSize: 13 },
  activeLabel: { color: colors.navy },
});
