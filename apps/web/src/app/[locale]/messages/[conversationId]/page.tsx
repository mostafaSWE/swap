import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getConfirmations,
  getMessages,
  getMyRatingForProposal,
  getProposalByConversationId,
} from "@swap/api";
import type { Locale } from "@swap/types";
import { EmptyState } from "@/components/primitives";
import { CTAButton } from "@/components/CTAButton";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchOtherParticipant } from "@/lib/chat";
import { isSupabaseConfigured } from "@/lib/env";
import { ChatRoom } from "./ChatRoom";

export default async function ChatRoomPage({
  params: { locale, conversationId },
}: {
  params: { locale: Locale; conversationId: string };
}) {
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) {
    const tn = await getTranslations("nav");
    return <EmptyState title={tn("login")} action={<CTAButton href="/login">{tn("login")}</CTAButton>} />;
  }

  const user = await requireUser(locale);
  const supabase = createClient();
  const [messages, otherUser, proposal] = await Promise.all([
    getMessages(supabase, conversationId),
    fetchOtherParticipant(conversationId, user.id),
    getProposalByConversationId(supabase, conversationId).catch(() => null),
  ]);
  // Deal-closing confirmation photos (only relevant once a proposal exists) and,
  // once the swap is completed, this user's existing rating (to show "you rated"
  // vs. the "rate this swap" prompt).
  const [confirmations, myRating] = await Promise.all([
    proposal ? getConfirmations(supabase, proposal.id).catch(() => []) : [],
    proposal && proposal.status === "completed"
      ? getMyRatingForProposal(supabase, proposal.id, user.id).catch(() => null)
      : null,
  ]);

  return (
    <ChatRoom
      conversationId={conversationId}
      currentUserId={user.id}
      otherUser={otherUser}
      initialMessages={messages}
      initialProposal={proposal}
      initialConfirmations={confirmations}
      initialMyRating={myRating}
    />
  );
}
