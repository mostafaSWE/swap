import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { CategoryIcon } from "./ui/CategoryIcon";

/** A category tile (web `CategoryCard`) — icon in an accent-tinted box + name. */
export function CategoryCard({
  name,
  icon,
  onPress,
}: {
  name: string;
  icon: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]} accessibilityRole="button">
      <View style={styles.iconBox}>
        <CategoryIcon icon={icon} size={24} color={colors.green} />
      </View>
      <Text style={styles.name} numberOfLines={2}>{name}</Text>
    </Pressable>
  );
}

/** Horizontal category rail for Home. The horizontal ScrollView anchors from the
 *  leading edge automatically (it follows the native RTL flag, which we set). */
export function CategoryCarousel({
  items,
  onSelect,
}: {
  items: { icon: string; name: string; key?: string }[];
  onSelect?: (icon: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {items.map((c) => (
        <CategoryCard key={c.key ?? c.icon} name={c.name} icon={c.icon} onPress={() => onSelect?.(c.icon)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    minHeight: 104,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    justifyContent: "space-between",
  },
  pressed: { opacity: 0.8 },
  iconBox: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: "rgba(24,182,106,0.15)", alignItems: "center", justifyContent: "center" },
  name: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: spacing.md },
  rail: { gap: spacing.sm, paddingVertical: spacing.xs },
});
