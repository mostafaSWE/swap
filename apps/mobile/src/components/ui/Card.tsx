import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "../../theme";

/** Bordered surface (web `.card`). Pressable when `onPress` is given. */
export function Card({
  children,
  onPress,
  padded = true,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  style?: ViewStyle;
}) {
  const content = <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.92 },
});
