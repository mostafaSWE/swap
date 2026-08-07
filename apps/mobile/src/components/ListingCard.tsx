import { StyleSheet, Text, View } from "react-native";
import { Repeat2, Star } from "lucide-react-native";
import type { ListingWithRelations } from "@swap/types";
import { localizedName } from "@swap/ui";
import { colors, radii, spacing } from "../theme";
import { locale, t } from "../i18n";
import { Badge, Card } from "./ui";
import { Icon } from "./ui/Icon";
import { ItemArtwork } from "./ItemArtwork";

/**
 * Listing card — the single discovery card used by home rails, browse, saved and
 * profiles. Cover artwork (category-tinted placeholder when imageless) with a
 * Featured star + condition overlay, a two-line title, a category · city meta row,
 * and a compact "wanted in exchange" line. The whole card is one accessible button.
 */
export function ListingCard({ listing, onPress }: { listing: ListingWithRelations; onPress?: () => void }) {
  const cover = [...(listing.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
  const category = localizedName(listing.category, locale);
  const city = localizedName(listing.city, locale);
  const conditionLabel = t(`mobile.detail.conditions.${listing.condition}`);
  const wanted = (listing.wanted_exchange ?? "").trim();
  const wantedText = wanted === "__any__" ? t("listing.openToAnyExchange") : wanted || t("listing.openToOffers");
  // Owner-only status pill via an explicit allow-map (never `!== "active"`, so a
  // stray `removed`/unknown status paints nothing). Non-active cards only ever
  // reach here through the owner-self "My listings" query.
  const statusBadge =
    listing.status === "hidden"
      ? { tone: "warning" as const, label: t("listing.statusPaused") }
      : listing.status === "completed"
        ? { tone: "neutral" as const, label: t("listing.statusCompleted") }
        : null;
  const a11yLabel = `${listing.title} · ${category} · ${conditionLabel} · ${city}${statusBadge ? ` · ${statusBadge.label}` : ""}`;

  return (
    <Card padded={false} onPress={onPress} accessibilityLabel={a11yLabel}>
      <View style={styles.artWrap}>
        <ItemArtwork imageUrl={cover} title={listing.title} categoryIcon={listing.category?.icon} style={StyleSheet.flatten([styles.art, statusBadge && styles.artDim])} />
        {listing.is_featured ? (
          <View style={styles.featured} pointerEvents="none">
            <Icon icon={Star} size={12} color={colors.navy} />
            <Text style={styles.featuredText}>{t("listing.featured")}</Text>
          </View>
        ) : null}
        <View style={styles.conditionPill} pointerEvents="none">
          <Text style={styles.conditionText}>{conditionLabel}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text numberOfLines={2} style={styles.title}>
          {listing.title}
        </Text>
        <View style={styles.metaRow}>
          {statusBadge ? <Badge label={statusBadge.label} tone={statusBadge.tone} /> : null}
          <Badge label={category} tone="neutral" />
          <Text numberOfLines={1} style={styles.city}>
            {city}
          </Text>
        </View>
        <View style={styles.wantedRow}>
          <Icon icon={Repeat2} size={14} color={colors.green} />
          <Text numberOfLines={1} style={styles.wantedText}>
            <Text style={styles.wantedLabel}>{t("listing.wantedExchange")}: </Text>
            {wantedText}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  artWrap: { position: "relative" },
  art: { width: "100%", aspectRatio: 16 / 10 },
  artDim: { opacity: 0.8 },
  // Overlays sit on the leading/trailing top of the artwork (logical insets → RTL-safe).
  featured: {
    position: "absolute",
    top: spacing.sm,
    start: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  featuredText: { color: colors.navy, fontSize: 11, fontWeight: "800" },
  conditionPill: {
    position: "absolute",
    top: spacing.sm,
    end: spacing.sm,
    backgroundColor: "rgba(15,23,42,0.78)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  conditionText: { color: colors.white, fontSize: 11, fontWeight: "700" },

  body: { padding: spacing.md, gap: spacing.xs },
  title: { color: colors.text, fontSize: 15, fontWeight: "700", lineHeight: 20, minHeight: 40 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  city: { color: colors.textMuted, fontSize: 12, flex: 1 },
  wantedRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 },
  wantedText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  wantedLabel: { color: colors.green, fontWeight: "700" },
});
