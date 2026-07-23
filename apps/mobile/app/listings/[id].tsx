import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Heart } from "lucide-react-native";
import { localizedName } from "@swap/ui";
import type { ListingWithRelations } from "@swap/types";
import {
  getListingById,
  incrementListingView,
  isListingSaved,
  saveListing,
  unsaveListing,
} from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { locale, t } from "../../src/i18n";
import { monthYear } from "../../src/lib/format";
import { colors, radii, spacing } from "../../src/theme";
import { Badge, Button, Divider, Icon } from "../../src/components/ui";
import { WantedCard } from "../../src/components/WantedCard";
import { SellerCard } from "../../src/components/SellerCard";
import { MessageButton } from "../../src/components/MessageButton";
import { ReportDialog } from "../../src/components/ReportDialog";
import { ItemArtwork } from "../../src/components/ItemArtwork";

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  // undefined = loading · null = not found
  const [listing, setListing] = useState<ListingWithRelations | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getListingById(supabase, id)
      .then((l) => active && setListing(l))
      .catch(() => active && setListing(null));
    // Best-effort view tracking + saved-state, once we know who's signed in.
    supabase.auth.getUser().then(({ data }) => {
      incrementListingView(supabase, id, data.user?.id ?? null).catch(() => undefined);
      if (data.user) isListingSaved(supabase, data.user.id, id).then((s) => active && setSaved(s)).catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, [id]);

  async function toggleSave() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/(tabs)/profile"); // real auth lands in M3
      return;
    }
    setSaveBusy(true);
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

  if (listing === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }
  if (listing === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>{t("mobile.detail.notFound")}</Text>
      </View>
    );
  }

  const images = listing.images ?? [];
  const owner = listing.owner;
  const mediaH = Math.round(width * 0.72);

  return (
    <>
      <Stack.Screen options={{ title: listing.title }} />
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        {images.length > 0 ? (
          <FlatList
            data={images}
            keyExtractor={(im) => im.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => <Image source={{ uri: item.image_url }} style={{ width, height: mediaH }} resizeMode="cover" />}
          />
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
          <Text style={styles.views}>{t("mobile.detail.views", { count: listing.view_count ?? 0 })}</Text>

          <WantedCard wanted={listing.wanted_exchange ?? ""} categoryIcon={listing.category?.icon ?? "other"} />

          {listing.description ? <Text style={styles.desc}>{listing.description}</Text> : null}

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
              onToggleFollow={() => undefined}
              onViewProfile={() => router.push({ pathname: "/users/[username]", params: { username: owner.username } })}
            />
          ) : null}

          <View style={styles.reportRow}>
            <ReportDialog onSubmit={() => undefined} />
          </View>
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <View style={styles.actions}>
        <Button
          variant="secondary"
          label={saved ? t("mobile.detail.saved") : t("mobile.detail.save")}
          leftIcon={<Icon icon={Heart} size={18} color={saved ? colors.green : colors.text} />}
          onPress={toggleSave}
          loading={saveBusy}
        />
        <View style={styles.msg}>
          <MessageButton onPress={() => router.push("/(tabs)/messages")} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing["3xl"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  notFound: { color: colors.textMuted, fontSize: 15 },
  body: { padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  city: { color: colors.textMuted, fontSize: 13, flex: 1 },
  views: { color: colors.textFaint, fontSize: 12 },
  desc: { color: colors.text, fontSize: 15, lineHeight: 22 },
  reportRow: { alignItems: "flex-start" },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  msg: { flex: 1 },
});
