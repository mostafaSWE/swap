import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  Conversation,
  Listing,
  ListingWithImages,
  Rating,
  SwapProposal,
  SwapProposalStatus,
  SwapProposalWithRelations,
} from "@swap/types";
import type {
  ConfirmSwapInput,
  CounterProposalInput,
  CreateProposalInput,
  CreateRatingInput,
  DisputeSwapInput,
  ListProposalsQuery,
} from "@swap/validation";
import { STORAGE_BUCKETS } from "@swap/config";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { PROPOSAL_SELECT } from "../../common/db.constants";
import { assertNotBlocked } from "../../common/blocks.util";

/** Statuses where the negotiation is still open to accept/counter/decline. */
const OPEN_STATUSES: SwapProposalStatus[] = ["pending", "countered"];
/** Statuses where a proposal may still be cancelled/withdrawn (incl. mid-closing). */
const CANCELLABLE_STATUSES: SwapProposalStatus[] = [
  "pending",
  "countered",
  "agreed",
  "awaiting_confirmation",
];
/** Statuses where deal-closing actions (confirm / dispute) apply. */
const CONFIRMABLE_STATUSES: SwapProposalStatus[] = ["agreed", "awaiting_confirmation"];
/** Statuses where post-swap ratings apply (you can only rate a finished swap). */
const RATEABLE_STATUSES: SwapProposalStatus[] = ["completed"];
/** Statuses that block a second active proposal for the same listing. */
const ACTIVE_STATUSES: SwapProposalStatus[] = [
  "pending",
  "countered",
  "agreed",
  "awaiting_confirmation",
];

/** Raw row from PROPOSAL_SELECT before `offered_items` is flattened. */
type ProposalRow = Omit<SwapProposalWithRelations, "offered_items"> & {
  offered_items: { listing: ListingWithImages }[];
};

@Injectable()
export class ProposalsService {
  constructor(private readonly supabase: SupabaseService) {}

  // Service-role client — bypasses RLS, so EVERY method enforces authorization
  // (participant / ownership / state) explicitly. See SupabaseService.
  private get db() {
    return this.supabase.admin;
  }

  /* ── Reads ── */

  async list(userId: string, query: ListProposalsQuery): Promise<SwapProposalWithRelations[]> {
    let q = this.db.from("swap_proposals").select(PROPOSAL_SELECT);
    if (query.role === "sent") q = q.eq("proposer_id", userId);
    else if (query.role === "received") q = q.eq("recipient_id", userId);
    else q = q.or(`proposer_id.eq.${userId},recipient_id.eq.${userId}`);
    if (query.status) q = q.eq("status", query.status);
    q = q.order("updated_at", { ascending: false });

    const { data, error } = await q.returns<ProposalRow[]>();
    if (error) throw error;
    return (data ?? []).map(flattenProposal);
  }

  async get(id: string, userId: string): Promise<SwapProposalWithRelations> {
    const row = await this.fetchWithRelations(id);
    if (row.proposer_id !== userId && row.recipient_id !== userId) {
      throw new ForbiddenException("You are not part of this proposal");
    }
    return flattenProposal(row);
  }

  /* ── Writes ── */

  async create(proposerId: string, input: CreateProposalInput): Promise<SwapProposalWithRelations> {
    // 1. Target listing must exist and be active; its owner is the recipient.
    const { data: target, error: targetErr } = await this.db
      .from("listings")
      .select("id, owner_id, status")
      .eq("id", input.listing_id)
      .maybeSingle();
    if (targetErr) throw targetErr;
    if (!target) throw new NotFoundException("Listing not found");
    if ((target as Listing).status !== "active") {
      throw new BadRequestException("This listing is not available for swaps");
    }
    const recipientId = (target as Listing).owner_id;
    if (recipientId === proposerId) {
      throw new BadRequestException("You cannot propose a swap on your own listing");
    }
    // Cannot propose a swap to someone in a block relationship (spec §3.8).
    await assertNotBlocked(this.db, proposerId, recipientId);

    // 2. Offered items must all belong to the proposer and be active.
    await this.assertOwnedActiveListings(input.offered_listing_ids, proposerId);

    // 3. One active proposal per (proposer, target listing).
    const { data: dupe } = await this.db
      .from("swap_proposals")
      .select("id")
      .eq("listing_id", input.listing_id)
      .eq("proposer_id", proposerId)
      .in("status", ACTIVE_STATUSES)
      .limit(1)
      .maybeSingle();
    if (dupe) {
      throw new BadRequestException("You already have an active proposal for this listing");
    }

    // 4. Find-or-create the 1:1 conversation for this listing.
    const conversation = await this.getOrCreateConversation(
      input.listing_id,
      proposerId,
      recipientId,
    );

    // 5. Insert the proposal (proposer just moved → last_actor = proposer).
    //    A partial unique index (migration 0005) is the real backstop against
    //    two concurrent creates racing past the SELECT guard above → 23505.
    const { data: proposal, error } = await this.db
      .from("swap_proposals")
      .insert({
        listing_id: input.listing_id,
        proposer_id: proposerId,
        recipient_id: recipientId,
        conversation_id: conversation.id,
        status: "pending",
        note: input.note ?? null,
        last_actor_id: proposerId,
      })
      .select("id")
      .single();
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new BadRequestException("You already have an active proposal for this listing");
      }
      throw error;
    }

    // 6. Offered items + link the conversation back to the proposal. If either
    //    write fails, delete the proposal so a zero-item proposal never survives
    //    (the writes are not transactional under the service-role client).
    try {
      await this.replaceItems(proposal.id, input.offered_listing_ids);
      const { error: linkErr } = await this.db
        .from("conversations")
        .update({ proposal_id: proposal.id })
        .eq("id", conversation.id);
      if (linkErr) throw linkErr;
    } catch (e) {
      await this.db.from("swap_proposals").delete().eq("id", proposal.id);
      throw e;
    }

    return this.get(proposal.id, proposerId);
  }

  async counter(
    id: string,
    userId: string,
    input: CounterProposalInput,
  ): Promise<SwapProposalWithRelations> {
    const proposal = await this.loadForAction(id, userId, OPEN_STATUSES);
    if (userId === proposal.last_actor_id) {
      throw new BadRequestException("You cannot counter your own outstanding offer");
    }
    // Per spec (§3.4) a counter "re-opens the listing picker", and that picker
    // shows the ORIGINAL proposer's listings — a counter only re-selects which
    // of the proposer's items are on the table, regardless of who counters. The
    // counterparty is never bound by a counter; they must still accept it.
    await this.assertOwnedActiveListings(input.offered_listing_ids, proposal.proposer_id);
    await this.replaceItems(id, input.offered_listing_ids);
    return this.transition(id, userId, "countered", proposal.status, { note: input.note });
  }

  async accept(id: string, userId: string): Promise<SwapProposalWithRelations> {
    const proposal = await this.loadForAction(id, userId, OPEN_STATUSES);
    if (userId === proposal.last_actor_id) {
      throw new BadRequestException("You cannot accept your own offer — wait for the other party");
    }
    // Re-validate before binding the deal: the target or offered listings may
    // have been removed / swapped away since the proposal was made (TOCTOU).
    await this.assertAcceptable(proposal);
    return this.transition(id, userId, "agreed", proposal.status);
  }

  async decline(id: string, userId: string): Promise<SwapProposalWithRelations> {
    const proposal = await this.loadForAction(id, userId, OPEN_STATUSES);
    if (userId === proposal.last_actor_id) {
      throw new BadRequestException("You cannot decline your own offer — cancel it instead");
    }
    return this.transition(id, userId, "cancelled", proposal.status);
  }

  async cancel(id: string, userId: string): Promise<SwapProposalWithRelations> {
    // Either party may withdraw an open, agreed, or still-confirming proposal.
    const proposal = await this.loadForAction(id, userId, CANCELLABLE_STATUSES);
    return this.transition(id, userId, "cancelled", proposal.status);
  }

  /* ── Deal closing (spec §3.4) ── */

  /**
   * Signed upload URL for a deal-closing confirmation photo. The path encodes
   * the proposal + uploader ({proposal_id}/{user_id}.{ext}) so the bucket's RLS
   * lets BOTH parties read it; `upsert` lets a party re-upload before completion.
   */
  async signConfirmationUpload(
    id: string,
    userId: string,
    fileName: string,
  ): Promise<{ path: string; token: string; signedUrl: string }> {
    await this.loadForAction(id, userId, CONFIRMABLE_STATUSES);
    const ext = (fileName.split(".").pop() ?? "jpg").toLowerCase();
    const path = `${id}/${userId}.${ext}`;
    const { data, error } = await this.db.storage
      .from(STORAGE_BUCKETS.swapConfirmations)
      .createSignedUploadUrl(path, { upsert: true });
    if (error) throw error;
    return { path, token: data.token, signedUrl: data.signedUrl };
  }

  /**
   * Register the caller's confirmation photo. A DB function records it under a
   * row lock and, once BOTH parties have confirmed, atomically completes the
   * swap and increments each party's completed_swaps_count — the only place
   * that counter ever changes (never by an admin; spec §3.9).
   */
  async confirm(
    id: string,
    userId: string,
    input: ConfirmSwapInput,
  ): Promise<SwapProposalWithRelations> {
    await this.loadForAction(id, userId, CONFIRMABLE_STATUSES);
    // The path is server-issued (signConfirmationUpload); reject anything that
    // is not this user's slot for this proposal.
    if (!input.photo_path.startsWith(`${id}/${userId}.`)) {
      throw new BadRequestException("Invalid confirmation photo");
    }
    const { error } = await this.db.rpc("record_swap_confirmation", {
      p_proposal_id: id,
      p_user_id: userId,
      p_photo_path: input.photo_path,
    });
    if (error) throw error;
    return this.get(id, userId);
  }

  /**
   * Flag a problem with a closing swap. Either party may dispute; this opens an
   * admin-visible report and moves the proposal to `disputed` (no counter bump).
   * The original proposal note is preserved — the reason lives on the report.
   */
  async dispute(
    id: string,
    userId: string,
    input: DisputeSwapInput,
  ): Promise<SwapProposalWithRelations> {
    const proposal = await this.loadForAction(id, userId, CONFIRMABLE_STATUSES);
    const otherId =
      proposal.proposer_id === userId ? proposal.recipient_id : proposal.proposer_id;
    const { error: reportErr } = await this.db.from("reports").insert({
      reporter_id: userId,
      target_type: "user",
      target_id: otherId,
      reason: "Exchange dispute",
      description: input.reason ?? null,
      status: "pending",
    });
    if (reportErr) throw reportErr;
    return this.transition(id, userId, "disputed", proposal.status);
  }

  /* ── Ratings (post-swap reviews, spec §3.4/§3.6/§3.9) ── */

  /**
   * Rate the other party after a swap completes (1–5 stars + optional text).
   * Opt-in and re-ratable: upserts one row per (proposal, rater). The ratee is
   * always the OTHER party — derived here, never trusted from the client. A DB
   * trigger keeps the ratee's profiles.rating (avg) + ratings_count in sync.
   */
  async rate(id: string, userId: string, input: CreateRatingInput): Promise<Rating> {
    const proposal = await this.loadForAction(id, userId, RATEABLE_STATUSES);
    const rateeId =
      proposal.proposer_id === userId ? proposal.recipient_id : proposal.proposer_id;
    const { data, error } = await this.db
      .from("ratings")
      .upsert(
        {
          proposal_id: id,
          rater_id: userId,
          ratee_id: rateeId,
          stars: input.stars,
          comment: input.comment ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "proposal_id,rater_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return data as Rating;
  }

  /* ── Helpers ── */

  private async assertOwnedActiveListings(ids: string[], ownerId: string): Promise<void> {
    const unique = [...new Set(ids)];
    const { data, error } = await this.db
      .from("listings")
      .select("id, owner_id, status")
      .in("id", unique);
    if (error) throw error;
    const rows = (data ?? []) as Listing[];
    if (rows.length !== unique.length) {
      throw new BadRequestException("One or more offered listings were not found");
    }
    for (const l of rows) {
      if (l.owner_id !== ownerId) {
        throw new BadRequestException("You can only offer your own listings");
      }
      if (l.status !== "active") {
        throw new BadRequestException("Offered listings must be active");
      }
    }
  }

  /** Re-check, at accept time, that the target + offered listings are still available. */
  private async assertAcceptable(proposal: SwapProposal): Promise<void> {
    const { data: target, error: targetErr } = await this.db
      .from("listings")
      .select("status")
      .eq("id", proposal.listing_id)
      .maybeSingle();
    if (targetErr) throw targetErr;
    if (!target || (target as Listing).status !== "active") {
      throw new BadRequestException("The requested listing is no longer available");
    }

    const { data: items, error: itemsErr } = await this.db
      .from("swap_proposal_items")
      .select("listing_id")
      .eq("proposal_id", proposal.id);
    if (itemsErr) throw itemsErr;
    const ids = (items ?? []).map((r) => r.listing_id);
    if (!ids.length) throw new BadRequestException("This proposal has no offered items");
    await this.assertOwnedActiveListings(ids, proposal.proposer_id);
  }

  /** Replace the proposal's offered items with the given listings (dedup'd). */
  private async replaceItems(proposalId: string, listingIds: string[]): Promise<void> {
    const { error: delErr } = await this.db
      .from("swap_proposal_items")
      .delete()
      .eq("proposal_id", proposalId);
    if (delErr) throw delErr;
    const rows = [...new Set(listingIds)].map((listing_id) => ({
      proposal_id: proposalId,
      listing_id,
    }));
    const { error } = await this.db.from("swap_proposal_items").insert(rows);
    if (error) throw error;
  }

  /** Load a proposal, assert the caller is a party, and assert an allowed status. */
  private async loadForAction(
    id: string,
    userId: string,
    allowed: SwapProposalStatus[],
  ): Promise<SwapProposal> {
    const { data, error } = await this.db
      .from("swap_proposals")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("Proposal not found");
    const proposal = data as SwapProposal;
    if (proposal.proposer_id !== userId && proposal.recipient_id !== userId) {
      throw new ForbiddenException("You are not part of this proposal");
    }
    if (!allowed.includes(proposal.status)) {
      throw new BadRequestException(`Cannot perform this action on a ${proposal.status} proposal`);
    }
    return proposal;
  }

  private async transition(
    id: string,
    actorId: string,
    status: SwapProposalStatus,
    fromStatus: SwapProposalStatus,
    extra: { note?: string | null } = {},
  ): Promise<SwapProposalWithRelations> {
    const patch: Record<string, unknown> = {
      status,
      last_actor_id: actorId,
      updated_at: new Date().toISOString(),
    };
    if (extra.note !== undefined) patch.note = extra.note ?? null;
    // Guard the write on the status we loaded. A concurrent confirm() RPC that
    // already completed the swap (and bumped completed_swaps_count under its row
    // lock) must not be silently overwritten by this blind transition — the
    // WHERE then matches 0 rows and `get()` returns the real, current state.
    const { error } = await this.db
      .from("swap_proposals")
      .update(patch)
      .eq("id", id)
      .eq("status", fromStatus);
    if (error) throw error;
    return this.get(id, actorId);
  }

  private async fetchWithRelations(id: string): Promise<ProposalRow> {
    const { data, error } = await this.db
      .from("swap_proposals")
      .select(PROPOSAL_SELECT)
      .eq("id", id)
      .maybeSingle<ProposalRow>();
    if (error) throw error;
    if (!data) throw new NotFoundException("Proposal not found");
    return data;
  }

  /**
   * Find-or-create the 1:1 conversation between proposer and recipient.
   * Mirrors ListingsService.startConversation (the get_or_create_conversation
   * RPC relies on auth.uid(), which is null under the service-role client).
   */
  private async getOrCreateConversation(
    listingId: string,
    currentUserId: string,
    otherUserId: string,
  ): Promise<Conversation> {
    const { data: mine } = await this.db
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId);
    const myIds = (mine ?? []).map((r) => r.conversation_id);

    if (myIds.length) {
      const { data: shared } = await this.db
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", otherUserId)
        .in("conversation_id", myIds)
        .limit(1)
        .maybeSingle();
      if (shared) {
        const { data } = await this.db
          .from("conversations")
          .select("*")
          .eq("id", shared.conversation_id)
          .single();
        return data as Conversation;
      }
    }

    const { data: conversation, error } = await this.db
      .from("conversations")
      .insert({ listing_id: listingId })
      .select("*")
      .single();
    if (error) throw error;

    const { error: partErr } = await this.db.from("conversation_participants").insert([
      { conversation_id: conversation.id, user_id: currentUserId },
      { conversation_id: conversation.id, user_id: otherUserId },
    ]);
    if (partErr) throw partErr;
    return conversation as Conversation;
  }
}

function flattenProposal(row: ProposalRow): SwapProposalWithRelations {
  const { offered_items, ...rest } = row;
  return { ...rest, offered_items: (offered_items ?? []).map((i) => i.listing) };
}
