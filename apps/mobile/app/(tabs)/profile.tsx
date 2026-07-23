import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { ListingWithRelations, Profile } from "@swap/types";
import { getListings, getProfileById } from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { locale, t } from "../../src/i18n";
import { monthYear } from "../../src/lib/format";
import { colors, spacing } from "../../src/theme";
import { Button } from "../../src/components/ui";
import { ProfileHeader } from "../../src/components/ProfileHeader";
import { ListingCard } from "../../src/components/ListingCard";
import { EmptyState } from "../../src/components/EmptyState";
import { Screen } from "../../src/components/Screen";

// Minimal session shape — avoids a direct @supabase/supabase-js type import
// (transitive dep → phantom under pnpm's isolated linker). We only need the id.
type Sess = { user: { id: string } } | null;

export default function ProfileTab() {
  const router = useRouter();
  const [session, setSession] = useState<Sess | undefined>(undefined); // undefined = resolving
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<ListingWithRelations[] | null>(null);

  // React to auth: initial session + every sign-in/out/refresh.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const uid = session?.user?.id;
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setListings(null);
      return;
    }
    let active = true;
    getProfileById(supabase, uid).then((p) => active && setProfile(p)).catch(() => undefined);
    getListings(supabase, { ownerId: uid, limit: 20 }).then((r) => active && setListings(r)).catch(() => active && setListings([]));
    return () => {
      active = false;
    };
  }, [uid]);

  if (session === undefined) {
    return <View style={styles.center}><ActivityIndicator color={colors.green} /></View>;
  }

  if (!session) {
    return (
      <Screen>
        <View style={styles.signedOut}>
          <EmptyState icon="👤" title={t("mobile.profile.signInPrompt")} />
          <Button label={t("mobile.profile.signIn")} onPress={() => router.push("/login")} fullWidth />
        </View>
      </Screen>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
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
        />
      ) : (
        <ActivityIndicator color={colors.green} />
      )}

      <View style={styles.actions}>
        <Button label={t("newListing.title")} onPress={() => router.push("/new-listing")} fullWidth />
        <Button variant="secondary" label={t("mobile.profile.saved")} onPress={() => router.push("/saved")} fullWidth />
        <Button variant="ghost" label={t("mobile.profile.signOut")} onPress={() => supabase.auth.signOut()} fullWidth />
      </View>

      <Text style={styles.section}>{t("mobile.profile.myListings")}</Text>
      {listings === null ? (
        <ActivityIndicator color={colors.green} />
      ) : listings.length === 0 ? (
        <EmptyState title={t("mobile.home.empty")} />
      ) : (
        listings.map((l) => (
          <ListingCard key={l.id} listing={l} onPress={() => router.push({ pathname: "/listings/[id]", params: { id: l.id } })} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  signedOut: { gap: spacing.lg },
  actions: { gap: spacing.sm },
  section: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: spacing.sm },
});
