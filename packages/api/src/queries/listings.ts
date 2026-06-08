import type { ListingCondition, ListingWithRelations, SortOption } from "@swap/types";
import type { SwapClient } from "../client";

/** Columns selected when we need a listing plus its joined relations. */
const LISTING_SELECT = `
  *,
  images:listing_images(*),
  owner:profiles!listings_owner_id_fkey(
    id, full_name, username, avatar_url, bio, country_id, city_id,
    is_verified, followers_count, following_count, listings_count, created_at
  ),
  category:categories(*),
  country:countries(*),
  city:cities(*)
`;

export interface ListingFilters {
  search?: string;
  categoryId?: string;
  countryId?: string;
  cityId?: string;
  condition?: ListingCondition;
  /** Only listings whose owner has a verified account. */
  verifiedOnly?: boolean;
  ownerId?: string;
  sort?: SortOption;
  limit?: number;
  offset?: number;
}

/** Browse active listings with optional filters. Respects RLS (active only for the public). */
export async function getListings(
  supabase: SwapClient,
  filters: ListingFilters = {},
): Promise<ListingWithRelations[]> {
  let query = supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active");

  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
    );
  }
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.countryId) query = query.eq("country_id", filters.countryId);
  if (filters.cityId) query = query.eq("city_id", filters.cityId);
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);

  query =
    filters.sort === "most_viewed"
      ? query.order("view_count", { ascending: false })
      : query.order("created_at", { ascending: false });

  query = query.range(
    filters.offset ?? 0,
    (filters.offset ?? 0) + (filters.limit ?? 24) - 1,
  );

  const { data, error } = await query.returns<ListingWithRelations[]>();
  if (error) throw error;

  // `verifiedOnly` filters on the joined owner; applied in-app to keep the SQL simple.
  const rows = data ?? [];
  return filters.verifiedOnly ? rows.filter((l) => l.owner?.is_verified) : rows;
}

export async function getFeaturedListings(
  supabase: SwapClient,
  limit = 6,
): Promise<ListingWithRelations[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<ListingWithRelations[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getListingById(
  supabase: SwapClient,
  id: string,
): Promise<ListingWithRelations | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .maybeSingle<ListingWithRelations>();
  if (error) throw error;
  return data;
}

/** Best-effort view counter. Errors are swallowed — a view is not critical. */
export async function incrementListingView(
  supabase: SwapClient,
  listingId: string,
  userId: string | null,
): Promise<void> {
  await supabase.from("listing_views").insert({
    listing_id: listingId,
    user_id: userId,
  });
  // TODO (Phase 2): move the counter bump into a Postgres trigger / RPC so it is
  // atomic and de-duplicated per user/IP instead of best-effort from the client.
}
