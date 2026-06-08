import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Conversation, Listing, ListingWithRelations } from "@swap/types";
import { FREE_PLAN_MAX_IMAGES, STORAGE_BUCKETS } from "@swap/config";
import type {
  CreateListingInput,
  CreateReportInput,
  ListingFiltersInput,
  UpdateListingInput,
} from "@swap/validation";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { LISTING_SELECT } from "../../common/db.constants";

@Injectable()
export class ListingsService {
  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.admin;
  }

  async list(filters: ListingFiltersInput): Promise<ListingWithRelations[]> {
    let query = this.db.from("listings").select(LISTING_SELECT).eq("status", "active");

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters.category) {
      const { data: cat } = await this.db
        .from("categories")
        .select("id")
        .eq("slug", filters.category)
        .maybeSingle();
      if (cat) query = query.eq("category_id", cat.id);
    }
    if (filters.country) query = query.eq("country_id", filters.country);
    if (filters.city) query = query.eq("city_id", filters.city);
    if (filters.condition) query = query.eq("condition", filters.condition);

    query =
      filters.sort === "most_viewed"
        ? query.order("view_count", { ascending: false })
        : query.order("created_at", { ascending: false });

    const offset = filters.offset ?? 0;
    query = query.range(offset, offset + (filters.limit ?? 24) - 1);

    const { data, error } = await query.returns<ListingWithRelations[]>();
    if (error) throw error;
    const rows = data ?? [];
    return filters.verified ? rows.filter((l) => l.owner?.is_verified) : rows;
  }

  async get(id: string): Promise<ListingWithRelations> {
    const { data, error } = await this.db
      .from("listings")
      .select(LISTING_SELECT)
      .eq("id", id)
      .maybeSingle<ListingWithRelations>();
    if (error) throw error;
    if (!data) throw new NotFoundException("Listing not found");
    return data;
  }

  /** Validate that category/country/city exist and the city belongs to the country. */
  private async validateRefs(categoryId: string, countryId: string, cityId: string): Promise<void> {
    const [{ data: cat }, { data: city }] = await Promise.all([
      this.db.from("categories").select("id").eq("id", categoryId).maybeSingle(),
      this.db.from("cities").select("id, country_id").eq("id", cityId).maybeSingle(),
    ]);
    if (!cat) throw new BadRequestException("Invalid category");
    if (!city) throw new BadRequestException("Invalid city");
    if (city.country_id !== countryId) {
      throw new BadRequestException("City does not belong to the selected country");
    }
  }

  async create(ownerId: string, input: CreateListingInput): Promise<Listing> {
    await this.validateRefs(input.category_id, input.country_id, input.city_id);
    const { data, error } = await this.db
      .from("listings")
      .insert({ ...input, owner_id: ownerId, status: "active" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  private async assertOwner(id: string, ownerId: string): Promise<Listing> {
    const { data, error } = await this.db.from("listings").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("Listing not found");
    if ((data as Listing).owner_id !== ownerId) {
      throw new ForbiddenException("You can only modify your own listings");
    }
    return data;
  }

  async update(id: string, ownerId: string, input: UpdateListingInput): Promise<Listing> {
    await this.assertOwner(id, ownerId);
    if (input.category_id && input.country_id && input.city_id) {
      await this.validateRefs(input.category_id, input.country_id, input.city_id);
    }
    const { data, error } = await this.db
      .from("listings")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  /** Soft delete: mark as removed (owner only). */
  async remove(id: string, ownerId: string): Promise<void> {
    await this.assertOwner(id, ownerId);
    const { error } = await this.db.from("listings").update({ status: "removed" }).eq("id", id);
    if (error) throw error;
  }

  /** Record a view (a DB trigger bumps listings.view_count). */
  async recordView(id: string, userId: string | null): Promise<void> {
    const { error } = await this.db.from("listing_views").insert({ listing_id: id, user_id: userId });
    if (error) throw error;
  }

  async report(
    listingId: string,
    reporterId: string,
    input: Omit<CreateReportInput, "target_type" | "target_id">,
  ): Promise<void> {
    const { error } = await this.db.from("reports").insert({
      reporter_id: reporterId,
      target_type: "listing",
      target_id: listingId,
      reason: input.reason,
      description: input.description ?? null,
      status: "pending",
    });
    if (error) throw error;
  }

  /** Find-or-create a 1:1 conversation between the caller and the listing owner. */
  async startConversation(
    listingId: string,
    currentUserId: string,
    otherUserId: string,
  ): Promise<Conversation> {
    if (currentUserId === otherUserId) {
      throw new BadRequestException("Cannot start a conversation with yourself");
    }

    // Look for an existing conversation that both users participate in.
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
    return conversation;
  }

  /** Signed upload URL for a listing image; enforces the free image limit. */
  async signImageUpload(
    listingId: string,
    ownerId: string,
    fileName: string,
  ): Promise<{ path: string; token: string; signedUrl: string }> {
    await this.assertOwner(listingId, ownerId);

    const { count } = await this.db
      .from("listing_images")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listingId);
    // TODO (Phase 2 — premium): raise this limit for paid plans.
    if ((count ?? 0) >= FREE_PLAN_MAX_IMAGES) {
      throw new BadRequestException(`Free plan allows up to ${FREE_PLAN_MAX_IMAGES} images`);
    }

    const ext = (fileName.split(".").pop() ?? "jpg").toLowerCase();
    const path = `${ownerId}/${listingId}/${count ?? 0}.${ext}`;
    const { data, error } = await this.db.storage
      .from(STORAGE_BUCKETS.listingImages)
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: data.token, signedUrl: data.signedUrl };
  }

  /* ── Saved listings ── */
  async save(listingId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from("saved_listings")
      .upsert({ user_id: userId, listing_id: listingId }, { onConflict: "user_id,listing_id" });
    if (error) throw error;
  }

  async unsave(listingId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from("saved_listings")
      .delete()
      .eq("user_id", userId)
      .eq("listing_id", listingId);
    if (error) throw error;
  }

  /** Register an uploaded image against a listing (re-checks the limit). */
  async addImage(listingId: string, ownerId: string, imageUrl: string): Promise<void> {
    await this.assertOwner(listingId, ownerId);
    const { count } = await this.db
      .from("listing_images")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listingId);
    if ((count ?? 0) >= FREE_PLAN_MAX_IMAGES) {
      throw new BadRequestException(`Free plan allows up to ${FREE_PLAN_MAX_IMAGES} images`);
    }
    const { error } = await this.db
      .from("listing_images")
      .insert({ listing_id: listingId, image_url: imageUrl, sort_order: count ?? 0 });
    if (error) throw error;
  }
}
