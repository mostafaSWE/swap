import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Repeat2 } from "lucide-react-native";
import { colors, radii, spacing } from "../theme";
import { t } from "../i18n";
import { Avatar } from "./ui/Avatar";
import { Badge } from "./ui/Badge";
import { Icon } from "./ui/Icon";
import { StatCell } from "./ui/StatCell";

/** Profile header for the public + own-profile screens (web `ProfileHeader`).
 *  Presentational; `memberSince` is pre-formatted, `action` is an optional CTA. */
export function ProfileHeader({
  name,
  username,
  uri,
  completedSwaps,
  rating,
  ratingsCount,
  memberSince,
  bio,
  listingsCount,
  followersCount,
  followingCount,
  action,
}: {
  name: string;
  username: string;
  uri?: string | null;
  completedSwaps: number;
  rating?: number | null;
  ratingsCount: number;
  memberSince: string;
  bio?: string | null;
  listingsCount: number;
  followersCount: number;
  followingCount: number;
  action?: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Avatar uri={uri} name={name} size="lg" />
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={styles.badges}>
            <Badge tone="neutral" icon={<Icon icon={Repeat2} size={12} color={colors.textMuted} />} label={`${completedSwaps} ${t("listing.completedSwaps")}`} />
            <Badge tone="warning" icon={<Text style={styles.star}>★</Text>} label={`${Number(rating ?? 0).toFixed(1)} (${ratingsCount})`} />
          </View>
          <Text style={styles.username} numberOfLines={1}>@{username}</Text>
          <Text style={styles.member} numberOfLines={1}>{t("profile.memberSince", { date: memberSince })}</Text>
        </View>
      </View>

      {bio ? <Text style={styles.bio}>{bio}</Text> : null}

      <View style={styles.stats}>
        <View style={styles.stat}><StatCell value={completedSwaps} label={t("listing.completedSwaps")} /></View>
        <View style={styles.stat}><StatCell value={listingsCount} label={t("profile.listings")} /></View>
        <View style={styles.stat}><StatCell value={followersCount} label={t("profile.followers")} /></View>
        <View style={styles.stat}><StatCell value={followingCount} label={t("profile.following")} /></View>
      </View>

      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg, gap: spacing.md },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  name: { color: colors.text, fontSize: 18, fontWeight: "800" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  star: { color: colors.warning, fontSize: 12 },
  username: { color: colors.textMuted, fontSize: 14 },
  member: { color: colors.textFaint, fontSize: 12 },
  bio: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  stats: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  stat: { flex: 1 },
  action: { marginTop: spacing.xs },
});
