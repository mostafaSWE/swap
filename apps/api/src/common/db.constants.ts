/** Shared PostgREST select strings used across services. */

export const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, username, avatar_url, bio, country_id, city_id, is_verified, followers_count, following_count, listings_count, created_at";

export const LISTING_SELECT = `
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
