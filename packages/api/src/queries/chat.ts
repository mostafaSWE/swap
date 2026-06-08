import type { Conversation, Message } from "@swap/types";
import type { SwapClient } from "../client";

/** List the messages of a conversation (oldest first). RLS limits this to participants. */
export async function getMessages(
  supabase: SwapClient,
  conversationId: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(
  supabase: SwapClient,
  input: { conversationId: string; senderId: string; body: string; imageUrl?: string },
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      body: input.body,
      image_url: input.imageUrl ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Find an existing 1:1 conversation between two users for a listing, or create one.
 * Uses the `get_or_create_conversation` RPC (see migrations) so participant rows
 * and the "cannot message yourself" rule are enforced server-side.
 */
export async function getOrCreateConversation(
  supabase: SwapClient,
  input: { currentUserId: string; otherUserId: string; listingId?: string | null },
): Promise<Conversation> {
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    other_user_id: input.otherUserId,
    p_listing_id: input.listingId ?? null,
  });
  if (error) throw error;
  return data as Conversation;
}

/** Subscribe to new messages in a conversation via Supabase Realtime. */
export function subscribeToMessages(
  supabase: SwapClient,
  conversationId: string,
  onMessage: (message: Message) => void,
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new as Message),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
