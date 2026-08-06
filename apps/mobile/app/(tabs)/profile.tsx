import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bookmark, LogOut, PackageOpen, PackagePlus, Pencil, Settings as SettingsIcon, UserRound } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { ListingWithRelations, Profile } from "@swap/types";
import { getListings, getProfileById } from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { locale, t } from "../../src/i18n";
import { monthYear } from "../../src/lib/format";
import { colors, radii, spacing } from "../../src/theme";
import { Button } from "../../src/components/ui";
import { Icon } from "../../src/components/ui/Icon";
import { ProfileHeader } from "../../src/components/ProfileHeader";
import { ListingCard } from "../../src/components/ListingCard";
import { EmptyState } from "../../src/components/EmptyState";
import { Screen } from "../../src/components/Screen";

type Sess = { user: { id: string } } | null;

export default function ProfileTab() {
  const router = useRouter();
  const [session, setSession] = useState<Sess | undefined>(undefined); // undefined = resolving
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<ListingWithRelations[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const uid = session?.user?.id;
  const load = useCallback((id: string) => {
    return Promise.all([
      getProfileById(supabase, id).then(setProfile).catch(() => undefined),
      getListings(supabase, { ownerId: id, limit: 20 }).then(setListings).catch(() => setListings([])),
    ]);
  }, []);

  useEffect(() => {
    if (!uid) { setProfile(null); setListings(null); return; }
    void load(uid);
  }, [uid, load]);

  async function onRefresh() {
    if (!uid) return;
    setRefreshing(true);
    await load(uid);
    setRefreshing(false);
  }

  if (session === undefined) {
    return <View style={styles.center}><ActivityIndicator color={colors.green} /></View>;
  }

  if (!session) {
    return (
      <Screen>
        <EmptyState
          icon={<Icon icon={UserRound} size={26} color={colors.green} />}
          title={t("mobile.profile.signInPrompt")}
          action={<Button label={t("mobile.profile.signIn")} onPress={() => router.push("/login")} fullWidth />}
        />
      </Screen>
    );
  }

  const goConnections = (tab: "followers" | "following") =>
    profile && router.push({ pathname: "/connections/[username]", params: { username: profile.username, tab } });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
    >
      {profile ? (
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
        />
      ) : (
        <ActivityIndicator color={colors.green} />
      )}

      <Button
        label={t("newListing.title")}
        onPress={() => router.push("/new-listing")}
        leftIcon={<Icon icon={PackagePlus} size={18} color={colors.navy} />}
        fullWidth
      />

      <View style={styles.quickRow}>
        <QuickTile icon={Pencil} label={t("profile.edit")} onPress={() => router.push("/profile/edit")} />
        <QuickTile icon={Bookmark} label={t("mobile.profile.saved")} onPress={() => router.push("/saved")} />
        <QuickTile icon={SettingsIcon} label={t("nav.settings")} onPress={() => router.push("/settings")} />
      </View>

      <View style={styles.listingsHead}>
        <Text style={styles.section}>{t("mobile.profile.myListings")}</Text>
        {listings && listings.length > 0 ? <Text style={styles.count}>{listings.length}</Text> : null}
      </View>
      {listings === null ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: spacing.md }} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<Icon icon={PackageOpen} size={26} color={colors.green} />}
          title={t("profile.noListings")}
          action={<Button label={t("newListing.title")} onPress={() => router.push("/new-listing")} leftIcon={<Icon icon={PackagePlus} size={18} color={colors.navy} />} />}
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} onPress={() => router.push({ pathname: "/listings/[id]", params: { id: l.id } })} />
          ))}
        </View>
      )}

      <Button variant="ghost" label={t("mobile.profile.signOut")} onPress={() => supabase.auth.signOut()} leftIcon={<Icon icon={LogOut} size={18} color={colors.danger} mirror />} fullWidth />
    </ScrollView>
  );
}

/** Compact quick-action tile (icon square + label) for the profile action row. */
function QuickTile({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={styles.tileIcon}><Icon icon={icon} size={20} color={colors.green} /></View>
      <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  quickRow: { flexDirection: "row", gap: spacing.sm },
  tile: { flex: 1, alignItems: "center", gap: spacing.xs, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingVertical: spacing.md },
  tilePressed: { opacity: 0.7 },
  tileIcon: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: colors.greenLight, alignItems: "center", justifyContent: "center" },
  tileLabel: { color: colors.text, fontSize: 12, fontWeight: "600" },
  listingsHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  section: { color: colors.text, fontSize: 18, fontWeight: "800" },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: "700", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill, overflow: "hidden" },
});
