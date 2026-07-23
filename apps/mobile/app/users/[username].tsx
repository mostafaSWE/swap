import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { ListingWithRelations, PublicProfile, RatingWithRater } from "@swap/types";
import { getListings, getPublicProfileByUsername, getRatingsForUser } from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { locale, t } from "../../src/i18n";
import { monthYear } from "../../src/lib/format";
import { colors, spacing } from "../../src/theme";
import { Avatar, RatingStars } from "../../src/components/ui";
import { ProfileHeader } from "../../src/components/ProfileHeader";
import { FollowButton } from "../../src/components/FollowButton";
import { ListingCard } from "../../src/components/ListingCard";
import { EmptyState } from "../../src/components/EmptyState";

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined);
  const [listings, setListings] = useState<ListingWithRelations[] | null>(null);
  const [reviews, setReviews] = useState<RatingWithRater[] | null>(null);

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

  if (profile === undefined) {
    return <View style={styles.center}><ActivityIndicator color={colors.green} /></View>;
  }
  if (profile === null) {
    return <View style={styles.center}><Text style={styles.notFound}>{t("mobile.detail.notFound")}</Text></View>;
  }

  return (
    <>
      <Stack.Screen options={{ title: `@${profile.username}` }} />
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
          action={<FollowButton following={false} onToggle={() => undefined} />}
        />

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
            <Text style={styles.section}>{t("profile.reviews")}</Text>
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
  section: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: spacing.sm },
  review: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.sm },
  reviewBody: { flex: 1, gap: 3 },
  reviewTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  reviewName: { color: colors.text, fontSize: 14, fontWeight: "700", flex: 1 },
  reviewDate: { color: colors.textFaint, fontSize: 12 },
  reviewComment: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
});
