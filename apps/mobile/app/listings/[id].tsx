import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bookmark, PackageX, Repeat2, Search, Share2, Star } from "lucide-react-native";
import { localizedName } from "@swap/ui";
import type { ListingWithRelations } from "@swap/types";
import {
  getListingById,
  getOrCreateConversation,
  incrementListingView,
  isFollowing,
  isListingSaved,
  followUser,
  saveListing,
  unfollowUser,
  unsaveListing,
} from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { locale, t } from "../../src/i18n";
import { fullDate, monthYear } from "../../src/lib/format";
import { colors, radii, spacing } from "../../src/theme";
import { Badge, Button, Divider, Icon } from "../../src/components/ui";
import { WantedCard } from "../../src/components/WantedCard";
import { SellerCard } from "../../src/components/SellerCard";
import { MessageButton } from "../../src/components/MessageButton";
import { shareListing } from "../../src/lib/share";
import { ProposeSwapSheet } from "../../src/components/ProposeSwapSheet";
import { ReportDialog } from "../../src/components/ReportDialog";
import { ItemArtwork } from "../../src/components/ItemArtwork";

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // undefined = loading · null = not found
  const [listing, setListing] = useState<ListingWithRelations | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!id) return;
    let active = true;
    // Resolve the viewer FIRST: getListingById gates non-active listings on ownership,
    // so it needs to know who is asking. Without the id, an owner opening their own
    // paused listing would get the not-found state.
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      if (active) setMyId(uid);
      getListingById(supabase, id, uid)
        .then((l) => active && setListing(l))
        .catch(() => active && setListing(null));
      incrementListingView(supabase, id, uid).catch(() => undefined);
      if (uid) isListingSaved(supabase, uid, id).then((s) => active && setSaved(s)).catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [id]);

  // Re-check on focus so a listing taken down while the screen sat in the back stack
  // resolves to not-found instead of rendering stale content indefinitely.
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let active = true;
      supabase.auth
        .getUser()
        .then(({ data }) =>
          getListingById(supabase, id, data.user?.id ?? null).then((l) => active && setListing(l)),
        )
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, [id]),
  );

  useEffect(() => {
    const ownerId = listing?.owner?.id;
    if (!myId || !ownerId || myId === ownerId) {
      setFollowing(false);
      return;
    }
    let active = true;
    isFollowing(supabase, myId, ownerId).then((value) => active && setFollowing(value)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [myId, listing?.owner?.id]);

  async function toggleSave() {
    if (saveBusy) return; // guard before the getUser await so a double-tap can't race save/unsave
    setSaveBusy(true);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setSaveBusy(false);
      router.push("/login");
      return;
    }
    const next = !saved;
    setSaved(next);
    try {
      if (next) await saveListing(supabase, data.user.id, id);
      else await unsaveListing(supabase, data.user.id, id);
    } catch {
      setSaved(!next); // revert
    } finally {
      setSaveBusy(false);
    }
  }

  async function toggleFollow() {
    if (!owner) return;
    if (!myId) {
      router.push("/login");
      return;
    }
    if (followBusy) return;
    const next = !following;
    setFollowing(next);
    setFollowBusy(true);
    try {
      await (next ? followUser(supabase, myId, owner.id) : unfollowUser(supabase, myId, owner.id));
    } catch {
      setFollowing(!next);
    } finally {
      setFollowBusy(false);
    }
  }

  function onGalleryScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveImg(Math.max(0, Math.min(page, (listing?.images?.length ?? 1) - 1)));
  }

  if (listing === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }
  if (listing === null) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <View style={styles.notFoundWrap}>
          <View style={styles.notFoundIcon}>
            <Icon icon={PackageX} size={30} color={colors.textMuted} />
          </View>
          <Text style={styles.notFoundTitle}>{t("mobile.detail.notFound")}</Text>
          <Button
            label={t("mobile.tab.browse")}
            onPress={() => router.replace("/browse")}
            leftIcon={<Icon icon={Search} size={16} color={colors.navy} />}
          />
        </View>
      </>
    );
  }

  const images = listing.images ?? [];
  const owner = listing.owner;
  const mediaH = Math.round(width * 0.72);

  return (
    <>
      <Stack.Screen
        options={{
          title: listing.title,
          headerRight: () => (
            <Pressable onPress={() => shareListing(listing.id, listing.title)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("listing.share")}>
              <Icon icon={Share2} size={22} color={colors.white} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        {images.length > 0 ? (
          <View style={{ position: "relative" }}>
            <FlatList
              data={images}
              keyExtractor={(im) => im.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onGalleryScroll}
              renderItem={({ item }) => <Image source={{ uri: item.image_url }} style={{ width, height: mediaH }} resizeMode="cover" />}
            />
            {images.length > 1 ? (
              <>
                <View style={styles.countPill} pointerEvents="none">
                  <Text style={styles.countText}>{`${activeImg + 1}/${images.length}`}</Text>
                </View>
                <View style={styles.dots} pointerEvents="none">
                  {images.map((im, i) => (
                    <View key={im.id} style={[styles.dot, i === activeImg && styles.dotActive]} />
                  ))}
                </View>
              </>
            ) : null}
            {listing.is_featured ? (
              <View style={styles.featuredBadge} pointerEvents="none">
                <Icon icon={Star} size={12} color={colors.navy} />
                <Text style={styles.featuredText}>{t("listing.featured")}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <ItemArtwork title={listing.title} categoryIcon={listing.category?.icon} style={{ width, height: mediaH }} />
        )}

        <View style={styles.body}>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.metaRow}>
            {listing.category ? <Badge label={localizedName(listing.category, locale)} tone="positive" /> : null}
            {listing.condition ? <Badge label={t(`mobile.detail.conditions.${listing.condition}`)} tone="neutral" /> : null}
            <Text style={styles.city} numberOfLines={1}>{localizedName(listing.city, locale)}</Text>
          </View>
          {/* Views + posted date, mirroring the web header meta row (which shows
              category · condition · city · views · "Posted {date}"). */}
          <View style={styles.subMetaRow}>
            <Text style={styles.views}>{t("mobile.detail.views", { count: listing.view_count ?? 0 })}</Text>
            {listing.created_at ? (
              <Text style={styles.views}>
                {t("listing.postedOn", { date: fullDate(listing.created_at, locale) })}
              </Text>
            ) : null}
          </View>

          <WantedCard wanted={listing.wanted_exchange ?? ""} categoryIcon={listing.category?.icon ?? "other"} />

          {listing.description ? (
            <View style={styles.descBlock}>
              <Text style={styles.descHeading}>{t("listing.description")}</Text>
              <Text style={styles.desc}>{listing.description}</Text>
            </View>
          ) : null}

          <Divider />

          {owner ? (
            <SellerCard
              name={owner.full_name}
              username={owner.username}
              uri={owner.avatar_url}
              completedSwaps={owner.completed_swaps_count}
              rating={owner.rating}
              ratingsCount={owner.ratings_count}
              memberSince={monthYear(owner.created_at, locale)}
              bio={owner.bio}
              isOwner={myId === owner.id}
              following={following}
              onToggleFollow={toggleFollow}
              onViewProfile={() => router.push({ pathname: "/users/[username]", params: { username: owner.username } })}
            />
          ) : null}

          {owner && myId !== owner.id ? (
            <View style={styles.reportRow}>
              <ReportDialog targetType="listing" targetId={listing.id} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky action bar — Save + Message secondary; Propose is the primary CTA. */}
      <View style={[styles.actions, { paddingBottom: insets.bottom || spacing.md }]}>
        {owner && myId === owner.id ? (
          // Only active/paused listings are editable; a completed listing has no
          // Edit CTA (the edit screen rejects it → would dead-end on not-found).
          listing.status === "active" || listing.status === "hidden" ? (
            <Button
              label={t("listing.editListing")}
              onPress={() => router.push({ pathname: "/listings/[id]/edit", params: { id: listing.id } })}
              fullWidth
            />
          ) : null
        ) : (
          <>
        <View style={styles.row}>
          <View style={styles.grow}>
            <Button
              variant="secondary"
              fullWidth
              label={saved ? t("mobile.detail.saved") : t("mobile.detail.save")}
              leftIcon={<Icon icon={Bookmark} size={18} color={saved ? colors.green : colors.text} />}
              onPress={toggleSave}
              loading={saveBusy}
            />
          </View>
          <View style={styles.grow}>
            <MessageButton
              variant="secondary"
              onPress={async () => {
                const { data } = await supabase.auth.getUser();
                if (!data.user || !owner) {
                  router.push("/login");
                  return;
                }
                try {
                  const conv = await getOrCreateConversation(supabase, {
                    currentUserId: data.user.id,
                    otherUserId: owner.id,
                    listingId: listing.id,
                  });
                  router.push({ pathname: "/messages/[id]", params: { id: conv.id } });
                } catch {
                  router.push("/login");
                }
              }}
            />
          </View>
        </View>
        {/* Hide Propose on your own listing (the backend rejects self-proposals). */}
        {owner && myId !== owner.id ? (
          <Button
            label={t("proposal.cta")}
            leftIcon={<Icon icon={Repeat2} size={18} color={colors.navy} />}
            onPress={() => (myId ? setProposeOpen(true) : router.push("/login"))}
            fullWidth
          />
        ) : null}
          </>
        )}
      </View>

      {proposeOpen && myId ? (
        <ProposeSwapSheet
          visible={proposeOpen}
          onClose={() => setProposeOpen(false)}
          targetListingId={listing.id}
          currentUserId={myId}
          onCreated={(conversationId) => {
            setProposeOpen(false);
            router.push(
              conversationId ? { pathname: "/messages/[id]", params: { id: conversationId } } : "/(tabs)/messages",
            );
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing["3xl"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background },
  notFoundIcon: { width: 64, height: 64, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  notFoundTitle: { color: colors.text, fontSize: 17, fontWeight: "700", textAlign: "center" },
  body: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  city: { color: colors.textMuted, fontSize: 13, flex: 1 },
  views: { color: colors.textFaint, fontSize: 12 },
  subMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.md },
  descBlock: { gap: spacing.xs },
  descHeading: { color: colors.text, fontSize: 16, fontWeight: "800" },
  desc: { color: colors.text, fontSize: 15, lineHeight: 22 },
  // Gallery overlays (logical insets → RTL-safe)
  countPill: { position: "absolute", top: spacing.md, end: spacing.md, backgroundColor: "rgba(15,23,42,0.72)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  countText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  dots: { position: "absolute", bottom: spacing.md, alignSelf: "center", flexDirection: "row", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { backgroundColor: colors.white, width: 18 },
  featuredBadge: { position: "absolute", top: spacing.md, start: spacing.md, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.green, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill },
  featuredText: { color: colors.navy, fontSize: 11, fontWeight: "800" },
  reportRow: { alignItems: "flex-start" },
  actions: {
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: "row", gap: spacing.sm },
  grow: { flex: 1 },
});
