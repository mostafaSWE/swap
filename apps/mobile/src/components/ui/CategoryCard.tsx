import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Category } from "@swap/types";
import { localizedName } from "@swap/ui";
import { colors, radii, spacing } from "../../theme";
import { locale } from "../../i18n";
import { CategoryIcon } from "./CategoryIcon";

/**
 * Vertical category tile — the native counterpart of the web `CategoryCard`
 * (surface card, an accent icon tile at the top, bold localized name below, and a
 * faint accent disc in the trailing-top corner). Used on the dedicated
 * `/categories` index. RTL-safe (the corner disc uses a logical `end` inset).
 */
export function CategoryCard({ category, onPress }: { category: Category; onPress: () => void }) {
  const name = localizedName(category, locale);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.disc} pointerEvents="none" />
      <View style={styles.iconTile}>
        <CategoryIcon icon={category.icon} size={22} color={colors.green} />
      </View>
      <Text style={styles.name} numberOfLines={2}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 112,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    justifyContent: "space-between",
  },
  pressed: { opacity: 0.75 },
  disc: { position: "absolute", top: -28, end: -28, width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(24,182,106,0.06)" },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: colors.text, fontSize: 14, fontWeight: "700", lineHeight: 19, marginTop: spacing.md },
});
