import { StyleSheet, Text, View } from "react-native";
import { CATEGORIES } from "@swap/config";
import { localizedName } from "@swap/ui";
import { colors, radii, spacing } from "../theme";
import { locale } from "../i18n";

/** Chips for the top-level categories (shared @swap/config catalog). Tapping to
 *  filter browse lands in M2. */
export function CategoryGrid() {
  return (
    <View style={styles.grid}>
      {CATEGORIES.map((cat) => (
        <View key={cat.id} style={styles.chip}>
          <Text style={styles.label}>{localizedName(cat, locale)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: colors.greenLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: { color: colors.green, fontWeight: "600", fontSize: 13 },
});
