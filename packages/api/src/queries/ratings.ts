import type { Rating, RatingWithRater } from "@swap/types";
import type { SwapClient } from "../client";

/**
 * Direct (RLS-protected) reads of post-swap ratings for the web/mobile UI.
 * Ratings are PUBLIC reviews (anyone can read), so these power the profile
 * reviews list and the "have I rated this swap yet?" check on the chat card.
 * All rating WRITES go through the NestJS backend (it validates the swap is
 * completed + the caller is a participant); see SwapApiClient.rateProposal.
 */

const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, username, avatar_url, bio, country_id, city_id, followers_count, following_count, listings_count, completed_swaps_count, rating, ratings_count, created_at";

/** The current user's rating for a given swap, or null if they haven't rated it. */
export async function getMyRatingForProposal(
  supabase: SwapClient,
  proposalId: string,
  raterId: string,
): Promise<Rating | null> {
  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("proposal_id", proposalId)
    .eq("rater_id", raterId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Reviews a user has RECEIVED, newest first, each with the rater's public
 * profile — for the reviews section on a profile page. RLS: world-readable.
 */
export async function getRatingsForUser(
  supabase: SwapClient,
  userId: string,
  limit = 20,
): Promise<RatingWithRater[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select(`*, rater:profiles!ratings_rater_id_fkey(${PUBLIC_PROFILE_COLUMNS})`)
    .eq("ratee_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<RatingWithRater[]>();
  if (error) throw error;
  return data ?? [];
}
