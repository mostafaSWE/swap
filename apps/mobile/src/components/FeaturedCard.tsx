import { Pressable, StyleSheet, Text, View } from "react-native";
import { MapPin, Sparkles } from "lucide-react-native";
import { colors, radii, spacing } from "../theme";
import { t } from "../i18n";
import { Avatar } from "./ui/Avatar";
import { Icon } from "./ui/Icon";
import { ItemArtwork } from "./ItemArtwork";
import { SwapPair } from "./SwapPair";

/** Wide card for the home "Featured swaps" carousel (web `FeaturedCard`).
 *  Presentational; `cityName` is pre-localized by the caller. */
export function FeaturedCard({
  title,
  imageUrl,
  categoryIcon,
  ownerName,
  ownerAvatarUrl,
  cityName,
  onPress,
}: {
  title: string;
  imageUrl?: string | null;
  categoryIcon?: string | null;
  ownerName?: string;
  ownerAvatarUrl?: string | null;
  cityName?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]} accessibilityRole="button">
      <View style={styles.art}>
        <ItemArtwork title={title} imageUrl={imageUrl} categoryIcon={categoryIcon} style={styles.artInner} />
        <View style={styles.badge}>
          <Icon icon={Sparkles} size={12} color={colors.green} />
          <Text style={styles.badgeText}>{t("home.featured")}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <SwapPair categoryIcon={categoryIcon} size="md" />
        <View style={styles.footer}>
          <Avatar uri={ownerAvatarUrl} name={ownerName} size="sm" />
          <Text style={styles.owner} numberOfLines={1}>{ownerName}</Text>
          {cityName ? (
            <View style={styles.city}>
              <Icon icon={MapPin} size={12} color={colors.textMuted} />
              <Text style={styles.cityText} numberOfLines={1}>{cityName}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 290, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden" },
  pressed: { opacity: 0.9 },
  art: { height: 160, width: "100%" },
  artInner: { width: "100%", height: "100%" },
  badge: {
    position: "absolute",
    top: 10,
    start: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(11,19,36,0.72)",
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: colors.text, fontSize: 11, fontWeight: "800" },
  body: { padding: 14, gap: 10 },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  owner: { flex: 1, color: colors.text, fontSize: 12, fontWeight: "600" },
  city: { flexDirection: "row", alignItems: "center", gap: 3 },
  cityText: { color: colors.textMuted, fontSize: 11 },
});
