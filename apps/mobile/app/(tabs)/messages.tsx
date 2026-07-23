import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { ConversationPreview } from "@swap/types";
import { supabase } from "../../src/lib/supabase";
import { fetchConversations } from "../../src/lib/chat";
import { locale, t } from "../../src/i18n";
import { timeAgo } from "../../src/lib/format";
import { colors, spacing } from "../../src/theme";
import { ConversationCard } from "../../src/components/ConversationCard";
import { EmptyState } from "../../src/components/EmptyState";
import { Screen } from "../../src/components/Screen";
import { Button } from "../../src/components/ui";

type Sess = { user: { id: string } } | null;

export default function MessagesTab() {
  const router = useRouter();
  const [session, setSession] = useState<Sess | undefined>(undefined);
  const [items, setItems] = useState<ConversationPreview[] | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const uid = session?.user?.id;
  const load = useCallback(() => {
    if (!uid) {
      setItems(null);
      return;
    }
    fetchConversations(uid).then(setItems).catch(() => setItems([]));
  }, [uid]);

  // Refetch whenever the tab regains focus (covers new messages / read state).
  useFocusEffect(useCallback(() => load(), [load]));

  if (session === undefined) return <View style={styles.center}><ActivityIndicator color={colors.green} /></View>;
  if (!session) {
    return (
      <Screen>
        <View style={styles.signedOut}>
          <EmptyState icon="💬" title={t("mobile.profile.signInPrompt")} />
          <Button label={t("mobile.profile.signIn")} onPress={() => router.push("/login")} fullWidth />
        </View>
      </Screen>
    );
  }
  if (items === null) return <View style={styles.center}><ActivityIndicator color={colors.green} /></View>;
  if (items.length === 0) return <Screen><EmptyState icon="💬" title={t("chat.empty")} /></Screen>;

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
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  signedOut: { gap: spacing.lg },
  list: { paddingHorizontal: spacing.lg },
  sep: { height: 1, backgroundColor: colors.border },
});
