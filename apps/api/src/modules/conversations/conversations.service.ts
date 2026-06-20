import { ForbiddenException, Injectable } from "@nestjs/common";
import type { Conversation, Message } from "@swap/types";
import type { SendMessageInput } from "@swap/validation";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { assertNotBlocked } from "../../common/blocks.util";

@Injectable()
export class ConversationsService {
  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.admin;
  }

  private async assertParticipant(conversationId: string, userId: string): Promise<void> {
    const { data } = await this.db
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) throw new ForbiddenException("Not a participant of this conversation");
  }

  async list(userId: string): Promise<Conversation[]> {
    const { data: parts } = await this.db
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);
    const ids = (parts ?? []).map((p) => p.conversation_id);
    if (!ids.length) return [];
    const { data, error } = await this.db
      .from("conversations")
      .select("*")
      .in("id", ids)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async messages(conversationId: string, userId: string): Promise<Message[]> {
    await this.assertParticipant(conversationId, userId);
    const { data, error } = await this.db
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async send(conversationId: string, senderId: string, input: SendMessageInput): Promise<Message> {
    await this.assertParticipant(conversationId, senderId);
    // Refuse to deliver across a block (spec §3.8). 1:1 chats have one other
    // participant; loop to stay correct if group chats are ever added.
    const { data: others } = await this.db
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversationId)
      .neq("user_id", senderId);
    for (const other of others ?? []) {
      await assertNotBlocked(this.db, senderId, other.user_id);
    }
    const { data, error } = await this.db
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        body: input.body,
        image_url: input.image_url ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    // Bump the conversation's updated_at so it sorts to the top.
    await this.db
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
    return data;
  }
}
