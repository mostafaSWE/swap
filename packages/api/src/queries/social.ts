import type { ListingWithRelations, PublicProfile, ReportTargetType } from "@swap/types";
import type { SwapClient } from "../client";

const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, username, avatar_url, bio, country_id, city_id, followers_count, following_count, listings_count, completed_swaps_count, rating, ratings_count, created_at";

/* ── Follows ── */

export async function followUser(
  supabase: SwapClient,
  followerId: string,
  followingId: string,
): Promise<void> {
  if (followerId === followingId) throw new Error("Cannot follow yourself");
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: followerId, following_id: followingId });
  if (error) throw error;
  // NOTE: followers_count / following_count are maintained by DB triggers.
}

export async function unfollowUser(
  supabase: SwapClient,
  followerId: string,
  followingId: string,
): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  if (error) throw error;
}

export async function isFollowing(
  supabase: SwapClient,
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/* ── Blocks ── */

export async function blockUser(
  supabase: SwapClient,
  blockerId: string,
  blockedId: string,
): Promise<void> {
  if (blockerId === blockedId) throw new Error("Cannot block yourself");
  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
}

export async function unblockUser(
  supabase: SwapClient,
  blockerId: string,
  blockedId: string,
): Promise<void> {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
}

/** Whether `blockerId` has blocked `blockedId` (one-directional — for button state). */
export async function isBlocked(
  supabase: SwapClient,
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("blocks")
    .select("*", { count: "exact", head: true })
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Public profiles of the users a given user has blocked (newest first). */
export async function getBlockedUsers(
  supabase: SwapClient,
  userId: string,
): Promise<PublicProfile[]> {
  const { data, error } = await supabase
    .from("blocks")
    .select(`created_at, blocked:profiles!blocks_blocked_id_fkey(${PUBLIC_PROFILE_COLUMNS})`)
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => (row as unknown as { blocked: PublicProfile | null }).blocked)
    .filter((p): p is PublicProfile => Boolean(p));
}

/* ── Saved listings ── */

export async function saveListing(
  supabase: SwapClient,
  userId: string,
  listingId: string,
): Promise<void> {
  const { error } = await supabase
    .from("saved_listings")
    .insert({ user_id: userId, listing_id: listingId });
  if (error) throw error;
}

export async function unsaveListing(
  supabase: SwapClient,
  userId: string,
  listingId: string,
): Promise<void> {
  const { error } = await supabase
    .from("saved_listings")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  if (error) throw error;
}

export async function isListingSaved(
  supabase: SwapClient,
  userId: string,
  listingId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("saved_listings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Listings a user has saved (newest first). */
export async function getSavedListings(
  supabase: SwapClient,
  userId: string,
): Promise<ListingWithRelations[]> {
  const { data, error } = await supabase
    .from("saved_listings")
    .select(
      `created_at, listing:listings(
        *,
        images:listing_images(*),
        owner:profiles!listings_owner_id_fkey(
          id, full_name, username, avatar_url, bio, country_id, city_id,
          followers_count, following_count, listings_count, completed_swaps_count, rating, ratings_count, created_at
        ),
        category:categories(*), country:countries(*), city:cities(*)
      )`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => (row as unknown as { listing: ListingWithRelations | null }).listing)
    .filter((l): l is ListingWithRelations => Boolean(l));
}

/* ── Reports ── */

export async function createReport(
  supabase: SwapClient,
  input: {
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
    description?: string;
  },
): Promise<void> {
  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    description: input.description ?? null,
    status: "pending",
  });
  if (error) throw error;
}
