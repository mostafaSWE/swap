import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { colors, radii, spacing } from "../../theme";
import { Icon } from "./Icon";

/** Custom checkbox + label (web `FormCheckbox`; RN has no native checkbox).
 *  The box+label row is `flexDirection:row` → the box sits at the start edge in
 *  both directions. */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  error?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        style={styles.row}
      >
        <View style={[styles.box, checked && styles.boxChecked]}>
          {checked ? <Icon icon={Check} size={14} color={colors.navy} /> : null}
        </View>
        <View style={styles.textCol}>
          <Text style={styles.label}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxChecked: { backgroundColor: colors.green, borderColor: colors.green },
  textCol: { flex: 1, gap: 2 },
  label: { color: colors.text, fontSize: 14 },
  hint: { color: colors.textMuted, fontSize: 12 },
  error: { color: colors.danger, fontSize: 12 },
});
