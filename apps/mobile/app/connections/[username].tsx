import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { FollowDirection } from "@swap/api";
import { getFollowers, getFollowing, getPublicProfileByUsername, followUser, unfollowUser } from "@swap/api";
import type { PublicProfile, PublicProfileWithFollow } from "@swap/types";
import { supabase } from "../../src/lib/supabase";
import { t } from "../../src/i18n";
import { colors, spacing } from "../../src/theme";
import { SegmentedControl } from "../../src/components/ui/SegmentedControl";
import { FollowButton } from "../../src/components/FollowButton";
import { UserRow } from "../../src/components/UserRow";
import { EmptyState } from "../../src/components/EmptyState";
import { ErrorState } from "../../src/components/ErrorState";

const LIMIT = 30;

/** Followers / Following list for a user. One screen, a segmented control switches
 *  direction; each row opens that person's profile and (for signed-in viewers, not
 *  self) offers a Follow/Unfollow toggle. Block-safe + paginated via the shared
 *  getFollowers/getFollowing (list_follows RPC).
 *
 *  Flat route `/connections/[username]?tab=followers` — deliberately NOT nested
 *  under `users/[username]/` because expo-router cannot have both a leaf file
 *  `[username].tsx` and a `[username]/` folder at the same path. */
export default function ConnectionsScreen() {
  const { username, tab: tabParam } = useLocalSearchParams<{ username: string; tab?: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(undefined);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [tab, setTab] = useState<FollowDirection>(tabParam === "following" ? "following" : "followers");
  const [rows, setRows] = useState<PublicProfileWithFollow[] | null>(null);
  const [rowsError, setRowsError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!username) return;
    let active = true;
    getPublicProfileByUsername(supabase, username)
      .then((p) => active && setProfile(p))
      .catch(() => active && setProfile(null));
    return () => {
      active = false;
    };
  }, [username]);

  const fetchPage = useCallback(
    (targetId: string, dir: FollowDirection, offset: number) =>
      (dir === "followers" ? getFollowers : getFollowing)(supabase, targetId, { limit: LIMIT, offset }),
    [],
  );

  // (Re)load the list when the target or the active tab changes.
  useEffect(() => {
    if (!profile) return;
    let active = true;
    setRows(null);
    setRowsError(false);
    setHasMore(true);
    fetchPage(profile.id, tab, 0)
      .then((page) => {
        if (!active) return;
        setRows(page);
        setHasMore(page.length === LIMIT);
      })
      // A failed first page must surface a retryable error, not a fake "no followers yet" empty.
      .catch(() => active && setRowsError(true));
    return () => {
      active = false;
    };
  }, [profile?.id, tab, fetchPage]);

  function reloadFirstPage() {
    if (!profile) return;
    setRows(null);
    setRowsError(false);
    setHasMore(true);
    fetchPage(profile.id, tab, 0)
      .then((page) => { setRows(page); setHasMore(page.length === LIMIT); })
      .catch(() => setRowsError(true));
  }

  async function loadMore() {
    if (!profile || !rows || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(profile.id, tab, rows.length);
      setRows((cur) => [...(cur ?? []), ...page]);
      setHasMore(page.length === LIMIT);
    } catch {
      /* keep what we have */
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleFollow(row: PublicProfileWithFollow) {
    if (!viewerId) return router.push("/login");
    if (busy[row.id]) return;
    const next = !row.is_following;
    setRows((cur) => (cur ?? []).map((r) => (r.id === row.id ? { ...r, is_following: next } : r)));
    setBusy((b) => ({ ...b, [row.id]: true }));
    try {
      await (next ? followUser(supabase, viewerId, row.id) : unfollowUser(supabase, viewerId, row.id));
    } catch {
      setRows((cur) => (cur ?? []).map((r) => (r.id === row.id ? { ...r, is_following: !next } : r)));
    } finally {
      setBusy((b) => ({ ...b, [row.id]: false }));
    }
  }

  if (profile === undefined) {
    return <View style={styles.center}><ActivityIndicator color={colors.green} /></View>;
  }
  if (profile === null) {
    return (
      <>
        <Stack.Screen options={{ title: t("mobile.detail.notFound") }} />
        <View style={styles.center}><Text style={styles.muted}>{t("mobile.detail.notFound")}</Text></View>
      </>
    );
  }

  const header = (
    <View style={styles.headerWrap}>
      <SegmentedControl<FollowDirection>
        value={tab}
        onChange={setTab}
        segments={[
          { value: "followers", label: `${t("profile.followers")}  ${profile.followers_count}` },
          { value: "following", label: `${t("profile.following")}  ${profile.following_count}` },
        ]}
      />
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: `@${profile.username}` }} />
      {rows === null ? (
        <View style={styles.root}>
          {header}
          {rowsError ? (
            <ErrorState onRetry={reloadFirstPage} />
          ) : (
            <ActivityIndicator color={colors.green} style={{ marginTop: spacing.xl }} />
          )}
        </View>
      ) : (
        <FlatList
          style={styles.root}
          contentContainerStyle={styles.content}
          data={rows}
          keyExtractor={(u) => u.id}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              onPress={() => router.push({ pathname: "/users/[username]", params: { username: item.username } })}
              action={
                viewerId && viewerId !== item.id ? (
                  <FollowButton following={item.is_following} onToggle={() => toggleFollow(item)} busy={busy[item.id]} fullWidth={false} />
                ) : null
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <EmptyState title={tab === "followers" ? t("profile.followersEmpty") : t("profile.followingEmpty")} />
            </View>
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.green} style={{ marginVertical: spacing.lg }} /> : null}
          refreshControl={
            <RefreshControl
              tintColor={colors.green}
              refreshing={false}
              onRefresh={() => profile && fetchPage(profile.id, tab, 0).then((p) => { setRows(p); setHasMore(p.length === LIMIT); }).catch(() => undefined)}
            />
          }
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"], flexGrow: 1 },
  headerWrap: { marginBottom: spacing.sm },
  sep: { height: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  muted: { color: colors.textMuted, fontSize: 15 },
  empty: { paddingTop: spacing.xl },
});
