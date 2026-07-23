import type { ConversationPreview, Message, PublicProfile, SwapProposalStatus } from "@swap/types";
import { getProposalStatuses } from "@swap/api";
import { supabase } from "./supabase";

// Port of web `lib/chat.ts` — builds conversation previews from raw Supabase
// queries (there is no single @swap/api inbox function). RLS limits every read
// to the participant.
const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, username, avatar_url, bio, country_id, city_id, followers_count, following_count, listings_count, completed_swaps_count, rating, ratings_count, created_at";

/** Conversation previews (other user + last message + unread + proposal status). */
export async function fetchConversations(userId: string): Promise<ConversationPreview[]> {
  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  const ids = (parts ?? []).map((p) => p.conversation_id);
  if (!ids.length) return [];

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .in("id", ids)
    .order("updated_at", { ascending: false });

  // Cosmetic proposal badge — a failure here must never take down the inbox.
  const statusByProposalId = await getProposalStatuses(
    supabase,
    (conversations ?? []).map((c) => c.proposal_id),
  ).catch((): Record<string, SwapProposalStatus> => ({}));

  return Promise.all(
    (conversations ?? []).map(async (conversation) => {
      const { data: otherPart } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversation.id)
        .neq("user_id", userId)
        .limit(1)
        .maybeSingle();

      const { data: otherUser } = await supabase
        .from("profiles")
        .select(PUBLIC_PROFILE_COLUMNS)
        .eq("id", otherPart?.user_id ?? "")
        .maybeSingle<PublicProfile>();

      const { data: last } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<Message>();

      const { count: unread } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conversation.id)
        .eq("is_read", false)
        .neq("sender_id", userId);

      return {
        ...conversation,
        other_user: otherUser ?? fallbackUser(),
        last_message: last ?? null,
        unread_count: unread ?? 0,
        proposal_status: conversation.proposal_id ? statusByProposalId[conversation.proposal_id] ?? null : null,
      } satisfies ConversationPreview;
    }),
  );
}

/** The other participant's public profile for a single conversation (chat header). */
export async function fetchOtherParticipant(conversationId: string, userId: string): Promise<PublicProfile | null> {
  const { data: otherPart } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!otherPart) return null;
  const { data } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("id", otherPart.user_id)
    .maybeSingle<PublicProfile>();
  return data;
}

function fallbackUser(): PublicProfile {
  return {
    id: "",
    full_name: "—",
    username: "unknown",
    avatar_url: null,
    bio: null,
    country_id: null,
    city_id: null,
    followers_count: 0,
    following_count: 0,
    listings_count: 0,
    completed_swaps_count: 0,
    rating: null,
    ratings_count: 0,
    created_at: new Date(0).toISOString(),
  };
}
