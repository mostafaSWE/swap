import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import type { ConversationPreview } from "@swap/types";
import { supabase } from "../../src/lib/supabase";
import { fetchConversations } from "../../src/lib/chat";
import { locale, t } from "../../src/i18n";
import { timeAgo } from "../../src/lib/format";
import { colors, spacing } from "../../src/theme";
import { ConversationCard } from "../../src/components/ConversationCard";
import { ConversationCardSkeleton } from "../../src/components/ConversationCardSkeleton";
import { EmptyState } from "../../src/components/EmptyState";
import { ErrorState } from "../../src/components/ErrorState";
import { Screen } from "../../src/components/Screen";
import { SignInGate } from "../../src/components/SignInGate";
import { Icon } from "../../src/components/ui/Icon";

type Sess = { user: { id: string } } | null;

export default function MessagesTab() {
  const router = useRouter();
  const [session, setSession] = useState<Sess | undefined>(undefined);
  const [items, setItems] = useState<ConversationPreview[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      setItems(null);
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const uid = session?.user?.id;
  const load = useCallback(async () => {
    if (!uid) {
      setItems(null);
      return;
    }
    setError(false);
    try {
      setItems(await fetchConversations(uid));
    } catch {
      setError(true);
    }
  }, [uid]);

  // Refetch whenever the tab regains focus (covers new messages / read state).
  useFocusEffect(useCallback(() => void load(), [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (session === undefined || (uid && items === null && !error)) {
    return (
      <View style={styles.skeletonWrap}>
        {[0, 1, 2, 3, 4].map((i) => (
          <ConversationCardSkeleton key={i} />
        ))}
      </View>
    );
  }
  if (!session) {
    return <SignInGate icon={MessageCircle} title={t("chat.signInTitle")} body={t("chat.signInPrompt")} next="/(tabs)/messages" />;
  }
  if (error) {
    return (
      <View style={styles.centerWrap}>
        <ErrorState onRetry={load} />
      </View>
    );
  }
  if (!items?.length) {
    return (
      <Screen>
        <EmptyState icon={<Icon icon={MessageCircle} size={26} color={colors.green} />} title={t("chat.empty")} />
      </Screen>
    );
  }

  return (
    <FlatList
      style={styles.root}
      data={items}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <ConversationCard
          name={item.other_user.full_name}
          uri={item.other_user.avatar_url}
          lastMessage={item.last_message?.body}
          time={item.last_message ? timeAgo(item.last_message.created_at, locale) : undefined}
          unreadCount={item.unread_count}
          proposalStatus={item.proposal_status ?? undefined}
          proposalLabel={item.proposal_status ? t(`proposal.status.${item.proposal_status}`) : undefined}
          onPress={() => router.push({ pathname: "/messages/[id]", params: { id: item.id } })}
        />
      )}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} colors={[colors.green]} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centerWrap: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, justifyContent: "center" },
  skeletonWrap: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: { paddingHorizontal: spacing.lg },
  sep: { height: 1, backgroundColor: colors.border },
});
