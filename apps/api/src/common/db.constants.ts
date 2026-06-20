/** Shared PostgREST select strings used across services. */

export const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, username, avatar_url, bio, country_id, city_id, followers_count, following_count, listings_count, completed_swaps_count, rating, ratings_count, created_at";

export const LISTING_SELECT = `
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

// A swap proposal joined with its target listing (full relations), the
// proposer's offered listings (id + images), and both parties' public profiles.
// `offered_items` arrives as `[{ listing }]` and is flattened in the service.
export const PROPOSAL_SELECT = `
  *,
  listing:listings!swap_proposals_listing_id_fkey(
    *,
    images:listing_images(*),
    owner:profiles!listings_owner_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
    category:categories(*),
    country:countries(*),
    city:cities(*)
  ),
  proposer:profiles!swap_proposals_proposer_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
  recipient:profiles!swap_proposals_recipient_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
  offered_items:swap_proposal_items(
    listing:listings(*, images:listing_images(*))
  )
`;
