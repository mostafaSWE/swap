import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bookmark, LogIn, Search } from "lucide-react-native";
import type { ListingWithRelations } from "@swap/types";
import { getSavedListings } from "@swap/api";
import { supabase } from "../src/lib/supabase";
import { t } from "../src/i18n";
import { colors, spacing } from "../src/theme";
import { Button } from "../src/components/ui/Button";
import { Icon } from "../src/components/ui/Icon";
import { ListingCard } from "../src/components/ListingCard";
import { ListingCardSkeleton } from "../src/components/ListingCardSkeleton";
import { EmptyState } from "../src/components/EmptyState";
import { ErrorState } from "../src/components/ErrorState";

/** Saved / wishlist listings for the signed-in user (web `/saved`). Refetches on
 *  focus so items unsaved from a detail screen (or now-unavailable) drop on return. */
export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [uid, setUid] = useState<string | null | undefined>(undefined); // undefined = resolving
  const [items, setItems] = useState<ListingWithRelations[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    if (uid === undefined) return; // still resolving
    if (!uid) {
      setItems([]);
      return;
    }
    setError(false);
    try {
      setItems(await getSavedListings(supabase, uid));
    } catch {
      setError(true);
    }
  }, [uid]);

  // Runs on focus + whenever `load` (i.e. uid) changes while focused.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const listPad = { padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing["2xl"] };

  return (
    <>
      <Stack.Screen options={{ title: t("mobile.saved.title") }} />
      {uid === undefined || (uid && items === null && !error) ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </View>
      ) : !uid ? (
        <View style={styles.center}>
          <EmptyState
            icon={<Icon icon={Bookmark} size={26} color={colors.textMuted} />}
            title={t("mobile.profile.signInPrompt")}
            action={
              <Button
                label={t("mobile.profile.signIn")}
                onPress={() => router.push("/login")}
                leftIcon={<Icon icon={LogIn} size={16} color={colors.navy} />}
              />
            }
          />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ErrorState onRetry={load} />
        </View>
      ) : items && items.length === 0 ? (
        <View style={styles.center}>
          <EmptyState
            icon={<Icon icon={Bookmark} size={26} color={colors.textMuted} />}
            title={t("mobile.saved.empty")}
            action={
              <Button
                label={t("mobile.tab.browse")}
                variant="secondary"
                onPress={() => router.push("/browse")}
                leftIcon={<Icon icon={Search} size={16} color={colors.text} />}
              />
            }
          />
        </View>
      ) : (
        <FlatList
          style={styles.root}
          data={items ?? []}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => (
            <ListingCard listing={item} onPress={() => router.push({ pathname: "/listings/[id]", params: { id: item.id } })} />
          )}
          contentContainerStyle={listPad}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} colors={[colors.green]} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.lg, flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, justifyContent: "center" },
});
