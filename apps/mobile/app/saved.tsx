import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import type { ListingWithRelations } from "@swap/types";
import { getSavedListings } from "@swap/api";
import { supabase } from "../src/lib/supabase";
import { t } from "../src/i18n";
import { colors, spacing } from "../src/theme";
import { ListingCard } from "../src/components/ListingCard";
import { EmptyState } from "../src/components/EmptyState";
import { Screen } from "../src/components/Screen";

/** Saved / wishlist listings for the signed-in user (web `/saved`). */
export default function SavedScreen() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null | undefined>(undefined); // undefined = resolving
  const [items, setItems] = useState<ListingWithRelations[] | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (uid === undefined) return;
    if (!uid) {
      setItems([]);
      return;
    }
    let active = true;
    getSavedListings(supabase, uid).then((r) => active && setItems(r)).catch(() => active && setItems([]));
    return () => {
      active = false;
    };
  }, [uid]);

  return (
    <>
      <Stack.Screen options={{ title: t("mobile.saved.title") }} />
      {uid === undefined || items === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.green} /></View>
      ) : !uid ? (
        <Screen><EmptyState icon="🔖" title={t("mobile.profile.signInPrompt")} /></Screen>
      ) : items.length === 0 ? (
        <Screen><EmptyState icon="🔖" title={t("mobile.saved.empty")} /></Screen>
      ) : (
        <ScrollView style={styles.root} contentContainerStyle={styles.content}>
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} onPress={() => router.push({ pathname: "/listings/[id]", params: { id: l.id } })} />
          ))}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing["3xl"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
});
