import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MoreVertical, SendHorizontal } from "lucide-react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import type { Message, PublicProfile, ReportTargetType, SwapProposalWithRelations } from "@swap/types";
import { getMessages, getProposalByConversationId, sendMessage, subscribeToMessages, subscribeToProposal } from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { api } from "../../src/lib/api";
import { fetchOtherParticipant } from "../../src/lib/chat";
import { useTerms } from "../../src/lib/terms";
import { locale, t } from "../../src/i18n";
import { timeAgo } from "../../src/lib/format";
import { colors, radii, spacing } from "../../src/theme";
import { ChatBubble } from "../../src/components/ChatBubble";
import { ProposalContextCard } from "../../src/components/ProposalContextCard";
import { ReportSheet } from "../../src/components/ReportDialog";
import { ErrorState } from "../../src/components/ErrorState";
import { SafetyDisclaimer } from "../../src/components/SafetyDisclaimer";
import { Avatar, Icon } from "../../src/components/ui";

export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ensureAccepted } = useTerms();
  const [uid, setUid] = useState<string | null>(null);
  const [other, setOther] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [proposal, setProposal] = useState<SwapProposalWithRelations | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which report sheet (if any) is open: a single message, or the whole thread.
  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string } | null>(null);
  // Live keyboard height — see the effect below for why we track it manually.
  const [kbHeight, setKbHeight] = useState(0);
  const listRef = useRef<FlatList<Message>>(null);

  function loadMessages() {
    if (!id) return;
    setLoadError(false);
    getMessages(supabase, id)
      .then((rows) => {
        setMessages(rows);
        setLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setLoading(false);
      });
  }

  useEffect(() => {
    if (!id) return;
    supabase.auth.getSession().then(({ data }) => {
      const myId = data.session?.user?.id ?? null;
      setUid(myId);
      if (myId) fetchOtherParticipant(id, myId).then(setOther).catch(() => undefined);
    });
    loadMessages();
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

  // Same direct-RLS read receipt as the web chat room. The inbox's count then
  // refreshes when the Messages tab regains focus.
  useEffect(() => {
    if (!id || !uid || !messages.length) return;
    void supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", id)
      .neq("sender_id", uid)
      .eq("is_read", false)
      .select("id")
      .then(({ data }) => {
        if (data?.length) setMessages((current) => current.map((message) => message.sender_id === uid ? message : { ...message, is_read: true }));
      });
  }, [id, uid, messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body || !uid || sending) return;
    // Apple 1.2 — a UGC post is blocked until the current Terms are accepted.
    if (!(await ensureAccepted())) return;
    setError(null);
    setSending(true);
    setDraft("");
    try {
      const msg = await sendMessage(supabase, { conversationId: id, senderId: uid, body });
      setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
    } catch {
      setDraft(body); // restore on failure
      setError(t("chat.sendError"));
    } finally {
      setSending(false);
    }
  }

  // Expo SDK 57 ships edge-to-edge on Android, where the window no longer resizes
  // for the keyboard — so a KeyboardAvoidingView can't lift the composer and the
  // input ends up hidden behind the keyboard (the reported bug). We track the
  // keyboard height ourselves and reserve that space at the bottom instead.
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => {
      setKbHeight(e.endCoordinates.height);
      // Keep the latest message visible above the composer as the keyboard rises.
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    });
    const hide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  function confirmBlock() {
    if (!other) return;
    Alert.alert(t("block.confirmTitle"), t("block.confirmBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("block.block"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.block(other.id);
            router.back(); // the thread is now restricted (messaging severed)
          } catch {
            Alert.alert(t("common.error"));
          }
        },
      },
    ]);
  }

  // Header overflow: report the whole conversation, or block the other user.
  function openMenu() {
    Alert.alert(other?.full_name ?? t("chat.title"), undefined, [
      { text: t("chat.reportConversation"), onPress: () => setReportTarget({ type: "conversation", id }) },
      ...(other ? [{ text: t("block.block"), style: "destructive" as const, onPress: confirmBlock }] : []),
      { text: t("common.cancel"), style: "cancel" as const },
    ]);
  }

  const canSend = !!draft.trim() && !sending;
  return (
    <>
      <Stack.Screen
        options={{
          title: other?.full_name ?? t("chat.title"),
          headerTitle: () =>
            other ? (
              <Pressable
                onPress={() => router.push({ pathname: "/users/[username]", params: { username: other.username } })}
                style={styles.headerTitle}
                accessibilityRole="button"
                accessibilityLabel={other.full_name}
              >
                <Avatar uri={other.avatar_url} name={other.full_name} size="sm" />
                <Text style={styles.headerName} numberOfLines={1}>{other.full_name}</Text>
              </Pressable>
            ) : (
              <Text style={styles.headerName}>{t("chat.title")}</Text>
            ),
          headerRight: () => (
            <Pressable onPress={openMenu} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("chat.reportConversation")}>
              <Icon icon={MoreVertical} size={22} color={colors.white} />
            </Pressable>
          ),
        }}
      />
      <View style={[styles.root, kbHeight > 0 ? { paddingBottom: kbHeight } : null]}>
        {loading ? (
          <View style={styles.centerFill}><ActivityIndicator color={colors.green} /></View>
        ) : loadError ? (
          <View style={styles.centerFill}><ErrorState onRetry={loadMessages} /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => {
              const isOwn = item.sender_id === uid;
              return (
                <Pressable
                  onLongPress={isOwn ? undefined : () => setReportTarget({ type: "message", id: item.id })}
                  delayLongPress={350}
                  accessibilityHint={isOwn ? undefined : t("chat.reportMessage")}
                >
                  <ChatBubble body={item.body} time={timeAgo(item.created_at, locale)} isOwn={isOwn} isRead={item.is_read} />
                </Pressable>
              );
            }}
            contentContainerStyle={styles.list}
            // The proposal card scrolls WITH the thread (pinned at the very top) so it
            // no longer eats the screen — the messages get the room, scroll up for context.
            ListHeaderComponent={
              <View>
                {proposal && uid ? <ProposalContextCard proposal={proposal} currentUserId={uid} onChange={setProposal} /> : null}
                <View style={styles.disclaimerWrap}><SafetyDisclaimer text={t("chat.disclaimerBeforeChat")} /></View>
              </View>
            }
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ItemSeparatorComponent={() => <View style={styles.gap} />}
            keyboardShouldPersistTaps="handled"
          />
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={[styles.composer, { paddingBottom: kbHeight > 0 ? spacing.sm : (insets.bottom || spacing.md) }]}>
          <TextInput
            style={styles.chatInput}
            placeholder={t("chat.placeholder")}
            placeholderTextColor={colors.textFaint}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable onPress={send} disabled={!canSend} style={[styles.send, !canSend && styles.sendDisabled]} accessibilityRole="button" accessibilityLabel={t("common.send")}>
            {sending ? <ActivityIndicator color={colors.navy} size="small" /> : <Icon icon={SendHorizontal} size={20} color={colors.navy} mirror />}
          </Pressable>
        </View>
      </View>

      {/* One report sheet drives both message (long-press) and conversation (menu). */}
      <ReportSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType={reportTarget?.type ?? "message"}
        targetId={reportTarget?.id ?? id}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerName: { color: colors.white, fontSize: 17, fontWeight: "700", maxWidth: 200 },
  list: { padding: spacing.lg },
  disclaimerWrap: { marginBottom: spacing.md },
  gap: { height: 6 },
  error: { color: colors.danger, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingTop: spacing.xs, textAlign: "center", fontSize: 13 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  chatInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === "ios" ? 12 : 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
    fontSize: 15,
  },
  send: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.5 },
});
