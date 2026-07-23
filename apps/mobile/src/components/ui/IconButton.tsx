import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";
import { colors, radii } from "../../theme";
import { Icon } from "./Icon";

/** Bare icon action (close, toggle, back). 44×44 tap target. */
export function IconButton({
  icon,
  onPress,
  size = 20,
  color = colors.text,
  accessibilityLabel,
  disabled,
  mirror,
}: {
  icon: LucideIcon;
  onPress?: () => void;
  size?: number;
  color?: string;
  accessibilityLabel: string;
  disabled?: boolean;
  mirror?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Icon icon={icon} size={size} color={color} mirror={mirror} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 44, height: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
});
