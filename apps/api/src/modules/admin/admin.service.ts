import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AdminAction, Listing, Profile, Report } from "@swap/types";
import type {
  AdminUpdateListingInput,
  AdminUpdateUserInput,
  UpdateReportInput,
} from "@swap/validation";
import { SupabaseService } from "../../common/supabase/supabase.service";

export interface AdminOverview {
  totalUsers: number;
  activeListings: number;
  hiddenListings: number;
  pendingReports: number;
  totalConversations: number;
  totalMessages: number;
  listingsByCountry: { country_id: string; count: number }[];
  usersByCountry: { country_id: string; count: number }[];
}

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.admin;
  }

  private async count(table: string, build?: (q: any) => any): Promise<number> {
    let q = this.db.from(table).select("*", { count: "exact", head: true });
    if (build) q = build(q);
    const { count } = await q;
    return count ?? 0;
  }

  private async groupByCountry(table: string): Promise<{ country_id: string; count: number }[]> {
    const { data } = await this.db.from(table).select("country_id");
    const tally: Record<string, number> = {};
    for (const row of data ?? []) {
      const id = (row as { country_id: string | null }).country_id;
      if (id) tally[id] = (tally[id] ?? 0) + 1;
    }
    return Object.entries(tally).map(([country_id, count]) => ({ country_id, count }));
  }

  async overview(): Promise<AdminOverview> {
    const [
      totalUsers,
      activeListings,
      hiddenListings,
      pendingReports,
      totalConversations,
      totalMessages,
      listingsByCountry,
      usersByCountry,
    ] = await Promise.all([
      this.count("profiles"),
      this.count("listings", (q) => q.eq("status", "active")),
      this.count("listings", (q) => q.eq("status", "hidden")),
      this.count("reports", (q) => q.eq("status", "pending")),
      this.count("conversations"),
      this.count("messages"),
      this.groupByCountry("listings"),
      this.groupByCountry("profiles"),
    ]);
    return {
      totalUsers,
      activeListings,
      hiddenListings,
      pendingReports,
      totalConversations,
      totalMessages,
      listingsByCountry,
      usersByCountry,
    };
  }

  private async logAction(
    adminId: string,
    actionType: string,
    targetType: string,
    targetId: string,
    notes?: string,
    ip?: string,
  ): Promise<void> {
    // The audit row is non-negotiable: surface a failure instead of swallowing
    // it, so a moderation write is never recorded as successful with no trail
    // (and so a lost `note` — whose only storage IS this row — fails loudly).
    const { error } = await this.db.from("admin_actions").insert({
      admin_id: adminId,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId,
      notes: notes ?? null,
      ip: ip ?? null,
    });
    if (error) throw error;
  }

  /* ── Users ── */
  async users(): Promise<Profile[]> {
    const { data } = await this.db
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  }

  async updateUser(
    adminId: string,
    id: string,
    input: AdminUpdateUserInput,
    ip?: string,
  ): Promise<Profile> {
    // Guard against self-lockout / self-demotion: an admin cannot flip their own
    // admin/ban/suspension state (AuthGuard + AdminGuard would lock them out, and
    // with a single admin that is unrecoverable without direct DB access).
    if (
      id === adminId &&
      (input.is_admin !== undefined || input.is_banned !== undefined || input.is_suspended !== undefined)
    ) {
      throw new ForbiddenException("Cannot change your own admin, ban, or suspension state");
    }
    const { data, error } = await this.db
      .from("profiles")
      .update(input)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("User not found");
    await this.logAction(adminId, "update_user", "user", id, JSON.stringify(input), ip);
    return data;
  }

  /* ── Listings ── */
  async listings(): Promise<Listing[]> {
    const { data } = await this.db
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  }

  async updateListing(
    adminId: string,
    id: string,
    input: AdminUpdateListingInput,
    ip?: string,
  ): Promise<Listing> {
    const { data, error } = await this.db
      .from("listings")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("Listing not found");
    await this.logAction(adminId, "update_listing", "listing", id, JSON.stringify(input), ip);
    return data;
  }

  /* ── Reports ── */
  async reports(): Promise<Report[]> {
    const { data } = await this.db
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  }

  async updateReport(
    adminId: string,
    id: string,
    input: UpdateReportInput,
    ip?: string,
  ): Promise<Report> {
    const { data, error } = await this.db
      .from("reports")
      .update({ status: input.status })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("Report not found");
    await this.logAction(adminId, "update_report", "report", id, input.status, ip);
    return data;
  }

  async actions(): Promise<AdminAction[]> {
    const { data } = await this.db
      .from("admin_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  }

  /* ── Moderation messaging & notes ─────────────────────────────────────── */

  private async assertUserExists(id: string): Promise<Profile> {
    const { data } = await this.db.from("profiles").select("*").eq("id", id).maybeSingle();
    if (!data) throw new NotFoundException("User not found");
    return data;
  }

  /**
   * Returns the id of the 1:1 conversation between the admin and `userId`,
   * creating it (with both participant rows) if none exists. Runs as the
   * service role, so it does not go through the RLS-bound get_or_create RPC.
   */
  private async getOrCreateConversation(adminId: string, userId: string): Promise<string> {
    const { data: mine } = await this.db
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", adminId);
    const myIds = (mine ?? []).map((r) => r.conversation_id);
    if (myIds.length) {
      const { data: shared } = await this.db
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId)
        .in("conversation_id", myIds)
        .limit(1);
      if (shared && shared.length) return shared[0].conversation_id;
    }

    const { data: convo, error } = await this.db
      .from("conversations")
      .insert({})
      .select("id")
      .single();
    if (error || !convo) throw error ?? new Error("Failed to create conversation");
    const { error: partErr } = await this.db.from("conversation_participants").insert([
      { conversation_id: convo.id, user_id: adminId },
      { conversation_id: convo.id, user_id: userId },
    ]);
    // Without both participant rows the message is undeliverable (no inbox row,
    // no new_message notification), so fail rather than return an orphan thread.
    if (partErr) throw partErr;
    return convo.id;
  }

  /** Inserts a message from the admin to the user and bumps the conversation. */
  private async deliverMessage(adminId: string, userId: string, body: string): Promise<void> {
    if (adminId === userId) throw new BadRequestException("Cannot message yourself");
    const conversationId = await this.getOrCreateConversation(adminId, userId);
    const { error } = await this.db
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: adminId, body });
    if (error) throw error;
    // Surface the message at the top of the user's inbox (ordered by updated_at).
    await this.db
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  private static snippet(text: string): string {
    return text.length > 140 ? `${text.slice(0, 137)}…` : text;
  }

  /** Sends a system message to a user (delivered as a chat message from the admin). */
  async sendUserMessage(adminId: string, userId: string, body: string, ip?: string): Promise<{ ok: true }> {
    await this.assertUserExists(userId);
    await this.deliverMessage(adminId, userId, body);
    await this.logAction(adminId, "message", "user", userId, AdminService.snippet(body), ip);
    return { ok: true };
  }

  /** Records a private moderator note about a user (admin-only readable audit row). */
  async addUserNote(adminId: string, userId: string, note: string, ip?: string): Promise<{ ok: true }> {
    await this.assertUserExists(userId);
    await this.logAction(adminId, "note", "user", userId, note, ip);
    return { ok: true };
  }

  /** Asks a listing owner to edit their listing (message to the owner + audit row). */
  async requestListingEdits(
    adminId: string,
    listingId: string,
    body: string,
    ip?: string,
  ): Promise<{ ok: true }> {
    const { data: listing } = await this.db
      .from("listings")
      .select("owner_id")
      .eq("id", listingId)
      .maybeSingle();
    if (!listing) throw new NotFoundException("Listing not found");
    await this.deliverMessage(adminId, listing.owner_id, body);
    await this.logAction(adminId, "request_edits", "listing", listingId, AdminService.snippet(body), ip);
    return { ok: true };
  }
}
