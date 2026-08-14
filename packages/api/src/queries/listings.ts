import type { ListingCondition, ListingStatus, ListingWithRelations, SortOption } from "@swap/types";
import type { SwapClient } from "../client";

/**
 * The listing statuses an owner may see on their OWN management surfaces
 * (profile "My listings" / web My Listings). Excludes `removed` (soft-deleted).
 * PUBLIC surfaces must NOT use this — they pass no `statuses` and stay active-only.
 * Shared so web + mobile can't drift.
 */
export const OWNER_VISIBLE_STATUSES: ListingStatus[] = ["active", "hidden", "completed"];

/** Columns selected when we need a listing plus its joined relations. */
const LISTING_SELECT = `
  *,
  images:listing_images(*),
  owner:profiles!listings_owner_id_fkey(
    id, full_name, username, avatar_url, bio, country_id, city_id,
    followers_count, following_count, listings_count, completed_swaps_count, rating, ratings_count, created_at
  ),
  category:categories(*),
  country:countries(*),
  city:cities(*)
`;

/** Order a listing's embedded images by sort_order (position 0 = cover). The
 *  PostgREST embed doesn't guarantee order, so normalize it for every consumer. */
function withSortedImages<T extends ListingWithRelations>(l: T): T {
  return { ...l, images: [...(l.images ?? [])].sort((a, b) => a.sort_order - b.sort_order) };
}

export interface ListingFilters {
  search?: string;
  categoryId?: string;
  countryId?: string;
  cityId?: string;
  condition?: ListingCondition;
  ownerId?: string;
  sort?: SortOption;
  limit?: number;
  offset?: number;
  isFeatured?: boolean;
  /**
   * Explicit status allow-list — OWNER-SELF surfaces only (e.g. OWNER_VISIBLE_STATUSES).
   * Omitted/empty → active-only, the public default. RLS still blocks a foreign
   * owner's non-active rows even if they are requested here, so this is leak-safe.
   */
  statuses?: ListingStatus[];
}

/** Browse listings with optional filters. Default = active-only (public); pass
 *  `statuses` (owner-self only) to include paused/completed. RLS enforces that
 *  non-active rows are only ever returned for the owner/admin. */
export async function getListings(
  supabase: SwapClient,
  filters: ListingFilters = {},
): Promise<ListingWithRelations[]> {
  let query = supabase.from("listings").select(LISTING_SELECT);
  query = filters.statuses?.length
    ? query.in("status", filters.statuses)
    : query.eq("status", "active");

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
  if (filters.isFeatured !== undefined) query = query.eq("is_featured", filters.isFeatured);

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
  return (data ?? []).map(withSortedImages);
}

/** Active listings from the users a given user follows — their "Following" feed (newest first). */
export async function getFollowingListings(
  supabase: SwapClient,
  userId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<ListingWithRelations[]> {
  const { data: follows, error: followErr } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  if (followErr) throw followErr;
  const ids = (follows ?? []).map((f) => f.following_id);
  if (ids.length === 0) return [];

  const offset = opts.offset ?? 0;
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "active")
    .in("owner_id", ids)
    .order("created_at", { ascending: false })
    .range(offset, offset + (opts.limit ?? 24) - 1)
    .returns<ListingWithRelations[]>();
  if (error) throw error;
  return (data ?? []).map(withSortedImages);
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
  return (data ?? []).map(withSortedImages);
}

/**
 * Fetch one listing for a CONSUMER surface (detail page).
 *
 * Status gating lives here, not only in RLS. The read policy is
 *   (status = 'active' AND NOT blocked) OR owner_id = auth.uid() OR is_admin(auth.uid())
 * so an ADMIN — and the owner — can read rows an admin has hidden or removed. Without
 * this check, a moderator browsing the app as a normal user still opened listings they
 * had just taken down (reported from a device: two admin-hidden listings were gone from
 * every feed but still reachable on the detail screen, via a deep link, a saved item,
 * or a conversation).
 *
 * `viewerId` is the signed-in user, or null/undefined for anonymous. Only the OWNER
 * keeps access to their own non-active listing — that is what makes "Paused" listings
 * openable from their own profile. Everyone else, admins included, gets null and the
 * caller's not-found state.
 *
 * Admin moderation tooling must NOT use this function — it goes through the
 * service-role admin API, which intentionally bypasses this.
 */
export async function getListingById(
  supabase: SwapClient,
  id: string,
  viewerId?: string | null,
): Promise<ListingWithRelations | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .maybeSingle<ListingWithRelations>();
  if (error) throw error;
  if (!data) return null;
  if (data.status !== "active" && data.owner_id !== viewerId) return null;
  return withSortedImages(data);
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
