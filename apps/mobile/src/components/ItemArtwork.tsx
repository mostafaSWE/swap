import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, spacing } from "../theme";
import { CategoryIcon } from "./ui/CategoryIcon";

/** Per-category placeholder tint (the first stop of the web gradient; solid on
 *  native for now — a gradient is a later polish via expo-linear-gradient). */
const TINT: Record<string, string> = {
  electronics: "#1e293b", mobiles: "#0d9488", computers: "#2563eb", gaming: "#7c3aed",
  appliances: "#0891b2", furniture: "#b45309", "home-garden": "#65a30d", cars: "#0369a1",
  motorcycles: "#c2410c", fashion: "#be185d", watches: "#44403c", sports: "#16a34a",
  toys: "#ea580c", cameras: "#475569",
};
const NEUTRAL = "#475569";

/**
 * ItemArtwork — a listing's cover image, or a brand-tinted placeholder (category
 * icon + title) when there is no image. Port of web `ItemArtwork`. The parent
 * sizes it via `style` (e.g. an aspect-ratio box).
 */
export function ItemArtwork({
  imageUrl,
  title,
  categoryIcon,
  style,
}: {
  imageUrl?: string | null;
  title: string;
  categoryIcon?: string | null;
  style?: ViewStyle;
}) {
  if (imageUrl) {
    return (
      <View style={[styles.wrap, style]}>
        <Image source={{ uri: imageUrl }} style={styles.img} resizeMode="cover" accessibilityLabel={title} />
      </View>
    );
  }
  const tint = TINT[categoryIcon ?? ""] ?? NEUTRAL;
  return (
    <View style={[styles.wrap, { backgroundColor: tint }, style]}>
      <View style={styles.placeholder}>
        <CategoryIcon icon={categoryIcon ?? "other"} size={40} color="rgba(255,255,255,0.92)" />
        <Text style={styles.phTitle} numberOfLines={2}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: colors.surface },
  img: { width: "100%", height: "100%" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.md },
  phTitle: { color: "rgba(255,255,255,0.92)", fontSize: 12, fontWeight: "600", textAlign: "center", lineHeight: 15 },
});
