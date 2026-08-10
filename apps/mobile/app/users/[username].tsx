import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ban, MessageCircle, Share2, Undo2 } from "lucide-react-native";
import type { ListingWithRelations, PublicProfile, RatingWithRater } from "@swap/types";
import { followUser, getListings, getOrCreateConversation, getPublicProfileByUsername, getRatingsForUser, isBlocked, isFollowing, unfollowUser } from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { api } from "../../src/lib/api";
import { locale, t } from "../../src/i18n";
import { monthYear } from "../../src/lib/format";
import { colors, spacing } from "../../src/theme";
import { Avatar, Button, Icon, RatingStars } from "../../src/components/ui";
import { ProfileHeader } from "../../src/components/ProfileHeader";
import { FollowButton } from "../../src/components/FollowButton";
import { ListingCard } from "../../src/components/ListingCard";
import { ReportDialog } from "../../src/components/ReportDialog";
import { EmptyState } from "../../src/components/EmptyState";
import { shareProfile } from "../../src/lib/share";

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined);
  const [listings, setListings] = useState<ListingWithRelations[] | null>(null);
  const [reviews, setReviews] = useState<RatingWithRater[] | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

  useEffect(() => {
    if (!username) return;
    let active = true;
    getPublicProfileByUsername(supabase, username)
      .then((p) => {
        if (!active) return;
        setProfile(p);
        if (!p) return;
        getListings(supabase, { ownerId: p.id, limit: 20 }).then((r) => active && setListings(r)).catch(() => active && setListings([]));
        getRatingsForUser(supabase, p.id).then((r) => active && setReviews(r)).catch(() => active && setReviews([]));
      })
      .catch(() => active && setProfile(null));
    return () => {
      active = false;
    };
  }, [username]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!viewerId || !profile || viewerId === profile.id) {
      setFollowing(false);
      setBlocked(false);
      return;
    }
    let active = true;
    isFollowing(supabase, viewerId, profile.id).then((value) => active && setFollowing(value)).catch(() => undefined);
    isBlocked(supabase, viewerId, profile.id).then((value) => active && setBlocked(value)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [viewerId, profile?.id]);

  /** Re-pull the profile's listings — after a block/unblock their active listings
   *  become RLS-hidden / visible again (no router.refresh() in Expo Router). */
  function refetchListings(id: string) {
    setListings(null);
    getListings(supabase, { ownerId: id, limit: 20 }).then(setListings).catch(() => setListings([]));
  }

  /** Nudge the viewed profile's follower count by ±1 (never below 0). Keeps the
   *  header count in sync with the Follow button optimistically; the server value
   *  is authoritative on the next load. */
  function bumpFollowers(delta: number) {
    setProfile((p) => (p ? { ...p, followers_count: Math.max(0, p.followers_count + delta) } : p));
  }

  async function toggleFollow() {
    if (!profile) return;
    if (!viewerId) {
      router.push("/login");
      return;
    }
    if (followBusy) return;
    const next = !following;
    setFollowing(next);
    bumpFollowers(next ? 1 : -1); // optimistic count
    setFollowBusy(true);
    try {
      await (next ? followUser(supabase, viewerId, profile.id) : unfollowUser(supabase, viewerId, profile.id));
    } catch {
      setFollowing(!next);
      bumpFollowers(next ? -1 : 1); // roll back the count too
    } finally {
      setFollowBusy(false);
    }
  }

  async function goMessage() {
    if (!profile) return;
    if (!viewerId) return router.push("/login");
    try {
      const conv = await getOrCreateConversation(supabase, { currentUserId: viewerId, otherUserId: profile.id });
      router.push({ pathname: "/messages/[id]", params: { id: conv.id } });
    } catch {
      Alert.alert(t("common.error"));
    }
  }

  const goConnections = (tab: "followers" | "following") =>
    profile && router.push({ pathname: "/connections/[username]", params: { username: profile.username, tab } });

  async function runBlock() {
    if (!profile || !viewerId || blockBusy) return;
    const wasFollowing = following;
    setBlockBusy(true);
    try {
      await api.block(profile.id);
      setBlocked(true);
      setFollowing(false); // blocking severs the follow edge both ways (DB trigger)
      if (wasFollowing) bumpFollowers(-1); // my severed follow drops their follower count
      refetchListings(profile.id);
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setBlockBusy(false);
    }
  }

  async function runUnblock() {
    if (!profile || !viewerId || blockBusy) return;
    setBlockBusy(true);
    try {
      await api.unblock(profile.id);
      setBlocked(false);
      refetchListings(profile.id); // NOTE: does NOT restore the severed follow (by design)
    } catch {
      Alert.alert(t("common.error"));
    } finally {
      setBlockBusy(false);
    }
  }

  function confirmBlock() {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    Alert.alert(t("block.confirmTitle"), t("block.confirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("block.block"), style: "destructive", onPress: runBlock },
    ]);
  }

  if (profile === undefined) {
    return <View style={styles.center}><ActivityIndicator color={colors.green} /></View>;
  }
  if (profile === null) {
    return <View style={styles.center}><Text style={styles.notFound}>{t("mobile.detail.notFound")}</Text></View>;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `@${profile.username}`,
          headerRight: () => (
            <Pressable onPress={() => shareProfile(profile.username, profile.full_name)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("listing.share")}>
              <Icon icon={Share2} size={22} color={colors.white} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <ProfileHeader
          name={profile.full_name}
          username={profile.username}
          uri={profile.avatar_url}
          completedSwaps={profile.completed_swaps_count}
          rating={profile.rating}
          ratingsCount={profile.ratings_count}
          memberSince={monthYear(profile.created_at, locale)}
          bio={profile.bio}
          listingsCount={profile.listings_count}
          followersCount={profile.followers_count}
          followingCount={profile.following_count}
          onPressFollowers={() => goConnections("followers")}
          onPressFollowing={() => goConnections("following")}
          action={viewerId === profile.id || blocked ? undefined : <FollowButton following={following} onToggle={toggleFollow} busy={followBusy} />}
        />

        {viewerId && viewerId !== profile.id && !blocked ? (
          <Button
            label={t("listing.message")}
            onPress={goMessage}
            leftIcon={<Icon icon={MessageCircle} size={18} color={colors.navy} />}
            fullWidth
          />
        ) : null}

        {viewerId && viewerId !== profile.id ? (
          <View style={styles.modRow}>
            {blocked ? (
              <View style={styles.blockedWrap}>
                <Text style={styles.blockedNotice}>{t("block.blockedNotice")}</Text>
                <Button
                  variant="secondary"
                  label={t("block.unblock")}
                  onPress={runUnblock}
                  loading={blockBusy}
                  leftIcon={<Icon icon={Undo2} size={16} color={colors.text} mirror />}
                />
              </View>
            ) : (
              <Button
                variant="ghost"
                label={t("block.block")}
                onPress={confirmBlock}
                loading={blockBusy}
                leftIcon={<Icon icon={Ban} size={16} color={colors.danger} />}
              />
            )}
            <ReportDialog targetType="user" targetId={profile.id} />
          </View>
        ) : null}

        <Text style={styles.section}>{t("profile.listings")}</Text>
        {listings === null ? (
          <ActivityIndicator color={colors.green} />
        ) : listings.length === 0 ? (
          <EmptyState title={t("mobile.home.empty")} />
        ) : (
          listings.map((l) => (
            <ListingCard key={l.id} listing={l} onPress={() => router.push({ pathname: "/listings/[id]", params: { id: l.id } })} />
          ))
        )}

        {reviews && reviews.length > 0 ? (
          <>
            <Text style={styles.section}>{t("profile.reviewsTitle", { count: reviews.length })}</Text>
            {reviews.map((r) => (
              <ReviewRow key={r.id} rating={r} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

function ReviewRow({ rating }: { rating: RatingWithRater }) {
  return (
    <View style={styles.review}>
      <Avatar uri={rating.rater?.avatar_url} name={rating.rater?.full_name} size="sm" />
      <View style={styles.reviewBody}>
        <View style={styles.reviewTop}>
          <Text style={styles.reviewName} numberOfLines={1}>{rating.rater?.full_name}</Text>
          <Text style={styles.reviewDate}>{monthYear(rating.created_at, locale)}</Text>
        </View>
        <RatingStars value={rating.stars} size="sm" />
        {rating.comment ? <Text style={styles.reviewComment}>{rating.comment}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  notFound: { color: colors.textMuted, fontSize: 15 },
  modRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, flexWrap: "wrap" },
  blockedWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1, flexWrap: "wrap" },
  blockedNotice: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  section: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: spacing.sm },
  review: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm },
  reviewBody: { flex: 1, gap: 3 },
  reviewTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  reviewName: { color: colors.text, fontSize: 14, fontWeight: "700", flex: 1 },
  reviewDate: { color: colors.textFaint, fontSize: 12 },
  reviewComment: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
});
