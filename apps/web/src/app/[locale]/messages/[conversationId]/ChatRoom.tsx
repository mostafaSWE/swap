"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Send } from "lucide-react";
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
import { Link } from "@/i18n/navigation";
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
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setBody("");
    try {
      const api = getApi();
      if (api) {
        const msg = await api.sendMessage(conversationId, { body: text });
        // Optimistically add (Realtime will also deliver; dedup by id).
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      } else {
        await sendMessage(supabase.current, {
          conversationId,
          senderId: currentUserId,
          body: text,
        });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-61px)] flex-col">
      {/* Header */}
      <header className="sticky top-[61px] z-20 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <Link href="/messages" aria-label="Back" className="text-ink md:hidden">
          <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden />
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
      <form onSubmit={submit} className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-white px-3 py-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("placeholder")}
          className="input-field flex-1"
        />
        <button type="submit" disabled={sending} className="btn-primary !px-3" aria-label={t("send")}>
          <Send className="h-5 w-5 rtl:rotate-180" aria-hidden />
        </button>
      </form>
    </div>
  );
}
