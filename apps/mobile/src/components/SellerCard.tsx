import { Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarDays, ChevronRight, Repeat2 } from "lucide-react-native";
import { colors, radii, spacing } from "../theme";
import { t } from "../i18n";
import { Avatar } from "./ui/Avatar";
import { Badge } from "./ui/Badge";
import { Icon } from "./ui/Icon";
import { FollowButton } from "./FollowButton";

/**
 * The person behind a listing (web `SellerCard`) — avatar, name, real trust
 * signals (completed swaps, rating, join date), optional bio, Follow action, and
 * a "view profile" link. Presentational; `memberSince` is pre-formatted.
 */
export function SellerCard({
  name,
  username,
  uri,
  completedSwaps,
  rating,
  ratingsCount,
  memberSince,
  bio,
  isOwner,
  following = false,
  onToggleFollow,
  onViewProfile,
}: {
  name: string;
  username: string;
  uri?: string | null;
  completedSwaps: number;
  rating?: number | null;
  ratingsCount: number;
  memberSince: string;
  bio?: string | null;
  isOwner?: boolean;
  following?: boolean;
  onToggleFollow?: () => void;
  onViewProfile?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{t("listing.aboutSeller")}</Text>

      <View style={styles.headerRow}>
        <Avatar uri={uri} name={name} size="lg" />
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.username} numberOfLines={1}>@{username}</Text>
        </View>
        {isOwner ? null : (
          <FollowButton following={following} onToggle={onToggleFollow ?? (() => undefined)} fullWidth={false} />
        )}
      </View>

      <View style={styles.badges}>
        <Badge
          tone="neutral"
          icon={<Icon icon={Repeat2} size={12} color={colors.textMuted} />}
          label={`${completedSwaps} ${t("listing.completedSwaps")}`}
        />
        <Badge tone="warning" icon={<Text style={styles.star}>★</Text>} label={`${Number(rating ?? 0).toFixed(1)} (${ratingsCount})`} />
        <View style={styles.member}>
          <Icon icon={CalendarDays} size={13} color={colors.textFaint} />
          <Text style={styles.memberText}>{t("profile.memberSince", { date: memberSince })}</Text>
        </View>
      </View>

      {bio ? <Text style={styles.bio} numberOfLines={2}>{bio}</Text> : null}

      <Pressable onPress={onViewProfile} style={styles.viewProfile} accessibilityRole="button">
        <Text style={styles.viewProfileText}>{t("listing.viewProfile")}</Text>
        <Icon icon={ChevronRight} size={16} color={colors.green} mirror />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md },
  eyebrow: { color: colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  identity: { flex: 1, minWidth: 0, gap: 2 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  username: { color: colors.textMuted, fontSize: 14 },
  badges: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  star: { color: colors.warning, fontSize: 12 },
  member: { flexDirection: "row", alignItems: "center", gap: 4 },
  memberText: { color: colors.textMuted, fontSize: 12 },
  bio: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  viewProfile: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  viewProfileText: { color: colors.green, fontSize: 14, fontWeight: "700" },
});
