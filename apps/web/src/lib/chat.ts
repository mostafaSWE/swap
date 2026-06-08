import type { ConversationPreview, Message, PublicProfile } from "@swap/types";
import { createClient } from "./supabase/server";

const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, username, avatar_url, bio, country_id, city_id, is_verified, followers_count, following_count, listings_count, created_at";

/** Build conversation previews (other user + last message + unread) for a user. */
export async function fetchConversations(userId: string): Promise<ConversationPreview[]> {
  const supabase = createClient();

  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  const conversationIds = (parts ?? []).map((p) => p.conversation_id);
  if (!conversationIds.length) return [];

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });

  const previews = await Promise.all(
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
      } satisfies ConversationPreview;
    }),
  );

  return previews;
}

/** The other participant's public profile for a single conversation. */
export async function fetchOtherParticipant(
  conversationId: string,
  userId: string,
): Promise<PublicProfile | null> {
  const supabase = createClient();
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
    is_verified: false,
    followers_count: 0,
    following_count: 0,
    listings_count: 0,
    created_at: new Date(0).toISOString(),
  };
}
