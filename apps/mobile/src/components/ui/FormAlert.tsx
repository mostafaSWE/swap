import { StyleSheet, Text, View } from "react-native";
import { CircleAlert } from "lucide-react-native";
import { colors, radii, spacing } from "../../theme";
import { Icon } from "./Icon";

/** Form-level error banner (web `FormAlert`): a bordered danger-tinted row with a
 *  leading alert icon. Announced to screen readers as a polite live region so an
 *  error that appears after submit is read out and isn't conveyed by colour alone. */
export function FormAlert({ message }: { message: string }) {
  return (
    <View style={styles.wrap} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon icon={CircleAlert} size={18} color={colors.danger} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
    borderRadius: radii.md,
    padding: spacing.md,
  },
  text: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 18 },
});
