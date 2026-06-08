import type { ReportTargetType } from "@swap/types";
import type { SwapClient } from "../client";

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
