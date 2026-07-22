import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";

/** Centered value + label stat cell (web `ProfileHeader` → `Stat`). */
export function StatCell({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: "center", gap: 2 },
  value: { color: colors.text, fontSize: 18, fontWeight: "800" },
  label: { color: colors.textMuted, fontSize: 11 },
});
