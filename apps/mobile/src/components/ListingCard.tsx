import { Image, StyleSheet, Text, View } from "react-native";
import type { ListingWithRelations } from "@swap/types";
import { localizedName } from "@swap/ui";
import { colors, spacing } from "../theme";
import { locale } from "../i18n";
import { Badge, Card } from "./ui";

/** Listing card: cover image + title + category badge · city. Built on the Card
 *  + Badge primitives. Pass `onPress` to open the listing detail. */
export function ListingCard({ listing, onPress }: { listing: ListingWithRelations; onPress?: () => void }) {
  const cover = [...(listing.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
  return (
    <Card padded={false} onPress={onPress}>
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
        <View style={styles.metaRow}>
          <Badge label={localizedName(listing.category, locale)} tone="positive" />
          <Text numberOfLines={1} style={styles.city}>
            {localizedName(listing.city, locale)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  image: { width: "100%", aspectRatio: 16 / 10, backgroundColor: colors.elevated },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderIcon: { fontSize: 32, opacity: 0.5 },
  body: { padding: spacing.md, gap: spacing.xs },
  title: { color: colors.text, fontSize: 15, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  // `flex:1` lets the city fill the remaining space; text aligns to start (RTL-aware) by default.
  city: { color: colors.textMuted, fontSize: 12, flex: 1 },
});
