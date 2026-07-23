import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { Send } from "lucide-react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import type { Message, PublicProfile, SwapProposalWithRelations } from "@swap/types";
import { getMessages, getProposalByConversationId, sendMessage, subscribeToMessages, subscribeToProposal } from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { fetchOtherParticipant } from "../../src/lib/chat";
import { locale, t } from "../../src/i18n";
import { timeAgo } from "../../src/lib/format";
import { colors, radii, spacing } from "../../src/theme";
import { ChatBubble } from "../../src/components/ChatBubble";
import { ProposalContextCard } from "../../src/components/ProposalContextCard";
import { Icon, Input } from "../../src/components/ui";

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [uid, setUid] = useState<string | null>(null);
  const [other, setOther] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [proposal, setProposal] = useState<SwapProposalWithRelations | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (!id) return;
    supabase.auth.getSession().then(({ data }) => {
      const myId = data.session?.user?.id ?? null;
      setUid(myId);
      if (myId) fetchOtherParticipant(id, myId).then(setOther).catch(() => undefined);
    });
    getMessages(supabase, id).then(setMessages).catch(() => undefined);
    // The proposal (if any) pinned to this conversation.
    getProposalByConversationId(supabase, id).then(setProposal).catch(() => undefined);
    // Realtime: append inserts we don't already have (dedupe vs our optimistic add).
    const unsub = subscribeToMessages(supabase, id, (m) =>
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m])),
    );
    return () => unsub();
  }, [id]);

  // Live proposal status: when the other party acts, refetch the full relations
  // (the Realtime payload is a bare row). Keyed on proposal.id so it subscribes
  // once the proposal is known and never re-subscribes on same-id updates.
  useEffect(() => {
    if (!proposal?.id || !id) return;
    const unsub = subscribeToProposal(supabase, proposal.id, () => {
      getProposalByConversationId(supabase, id).then((p) => p && setProposal(p)).catch(() => undefined);
    });
    return () => unsub();
  }, [proposal?.id, id]);

  async function send() {
    const body = draft.trim();
    if (!body || !uid || sending) return;
    setSending(true);
    setDraft("");
    try {
      const msg = await sendMessage(supabase, { conversationId: id, senderId: uid, body });
      setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
    } catch {
      setDraft(body); // restore on failure
    } finally {
      setSending(false);
    }
  }

  const canSend = !!draft.trim() && !sending;
  return (
    <>
      <Stack.Screen options={{ title: other?.full_name ?? t("chat.title") }} />
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={styles.root}
      >
        {proposal && uid ? (
          <ProposalContextCard proposal={proposal} currentUserId={uid} onChange={setProposal} />
        ) : null}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <ChatBubble body={item.body} time={timeAgo(item.created_at, locale)} isOwn={item.sender_id === uid} />
          )}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          keyboardShouldPersistTaps="handled"
        />
        <View style={styles.composer}>
          <View style={styles.inputWrap}>
            <Input placeholder={t("chat.placeholder")} value={draft} onChangeText={setDraft} multiline />
          </View>
          <Pressable onPress={send} disabled={!canSend} style={[styles.send, !canSend && styles.sendDisabled]} accessibilityRole="button">
            <Icon icon={Send} size={20} color={colors.navy} mirror />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  gap: { height: 6 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  inputWrap: { flex: 1 },
  send: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.5 },
});
