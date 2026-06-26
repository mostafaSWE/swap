"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { sendMessage, subscribeToMessages } from "@swap/api";
import type {
  Message,
  PublicProfile,
  Rating,
  SwapConfirmationView,
  SwapProposalWithRelations,
} from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { Link, useRouter } from "@/i18n/navigation";
import { ChatBubble } from "@/components/ChatBubble";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProposalContextCard } from "@/components/ProposalContextCard";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

export function ChatRoom({
  conversationId,
  currentUserId,
  otherUser,
  initialMessages,
  initialProposal,
  initialConfirmations,
  initialMyRating,
}: {
  conversationId: string;
  currentUserId: string;
  otherUser: PublicProfile | null;
  initialMessages: Message[];
  initialProposal: SwapProposalWithRelations | null;
  initialConfirmations: SwapConfirmationView[];
  initialMyRating: Rating | null;
}) {
  const t = useTranslations("chat");
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient());

  useEffect(() => {
    const unsubscribe = subscribeToMessages(supabase.current, conversationId, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return unsubscribe;
  }, [conversationId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when room opens or new messages arrive
  useEffect(() => {
    async function markAsRead() {
      try {
        const { error, data } = await supabase.current
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .neq("sender_id", currentUserId)
          .eq("is_read", false)
          .select("id");
        if (error) {
          console.error("Failed to mark messages as read:", error);
        } else if (data && data.length > 0) {
          // If we actually marked any messages as read, trigger a server refresh so the sidebar updates!
          router.refresh();
        }
      } catch (err) {
        console.error("Failed to mark messages as read:", err);
      }
    }
    markAsRead();
  }, [conversationId, messages, currentUserId, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    setBody("");
    try {
      const api = getApi();
      let sentMsg: Message | null = null;
      if (api) {
        sentMsg = await api.sendMessage(conversationId, { body: text });
        // Optimistically add (Realtime will also deliver; dedup by id).
        setMessages((prev) => (prev.some((m) => m.id === sentMsg!.id) ? prev : [...prev, sentMsg!]));
      } else {
        sentMsg = await sendMessage(supabase.current, {
          conversationId,
          senderId: currentUserId,
          body: text,
        });
      }
      router.refresh();
    } catch {
      // Don't lose what the user typed (a network/CORS/auth failure must never
      // silently swallow the message) — restore it and surface the error.
      setBody(text);
      setError(t("sendError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-61px)] flex-col">
      {/* Header */}
      <header className="sticky top-[61px] z-20 flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <Link href="/messages" aria-label="Back" className="text-ink md:hidden">
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" aria-hidden />
        </Link>
        {otherUser ? (
          <Link href={`/users/${otherUser.username}`} className="flex items-center gap-2">
            <ProfileAvatar src={otherUser.avatar_url} name={otherUser.full_name} size="sm" />
            <span className="font-semibold text-ink">{otherUser.full_name}</span>
          </Link>
        ) : null}
      </header>

      {/* Proposal context — pinned above the message stream */}
      {initialProposal ? (
        <ProposalContextCard
          initialProposal={initialProposal}
          initialConfirmations={initialConfirmations}
          initialMyRating={initialMyRating}
          currentUserId={currentUserId}
        />
      ) : null}

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto bg-canvas px-4 py-4">
        <SafetyDisclaimer variant="compact" />
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} isOwn={m.sender_id === currentUserId} />
        ))}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      {error ? (
        <p className="sticky bottom-[56px] bg-surface px-4 py-1.5 text-center text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <form onSubmit={submit} className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-surface px-3 py-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("placeholder")}
          className="input-field flex-1"
        />
        <button type="submit" disabled={sending} className="btn-primary !px-3" aria-label={t("send")}>
          <Send className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
        </button>
      </form>
    </div>
  );
}
