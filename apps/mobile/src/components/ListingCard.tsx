import { Image, StyleSheet, Text, View } from "react-native";
import type { ListingWithRelations } from "@swap/types";
import { localizedName } from "@swap/ui";
import { colors, radii, spacing } from "../theme";
import { locale } from "../i18n";

/** Listing card: cover image + title + category · city. Tap-to-detail lands in
 *  M2 (this is the read/browse surface). */
export function ListingCard({ listing }: { listing: ListingWithRelations }) {
  const cover = [...(listing.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
  return (
    <View style={styles.card}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderIcon}>🖼️</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.title}>
          {listing.title}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {localizedName(listing.category, locale)} · {localizedName(listing.city, locale)}
        </Text>
      </View>
    </View>
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
  image: { width: "100%", aspectRatio: 16 / 10, backgroundColor: colors.elevated },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderIcon: { fontSize: 32, opacity: 0.5 },
  body: { padding: spacing.md, gap: 2 },
  title: { color: colors.text, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: 12 },
});
