import { StyleSheet, View } from "react-native";
import { CATEGORIES } from "@swap/config";
import { localizedName } from "@swap/ui";
import { spacing } from "../theme";
import { locale } from "../i18n";
import { Chip } from "./ui";

/** Top-level category chips (shared @swap/config catalog), using the Chip
 *  primitive. Tapping to filter browse lands in M2. */
export function CategoryGrid() {
  return (
    <View style={styles.grid}>
      {CATEGORIES.map((cat) => (
        <Chip key={cat.id} label={localizedName(cat, locale)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
