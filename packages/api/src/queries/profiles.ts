import type { Profile, PublicProfile } from "@swap/types";
import type { SwapClient } from "../client";

const PUBLIC_PROFILE_COLUMNS =
  "id, full_name, username, avatar_url, bio, country_id, city_id, followers_count, following_count, listings_count, completed_swaps_count, rating, ratings_count, created_at";

export async function getProfileById(
  supabase: SwapClient,
  id: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPublicProfileByUsername(
  supabase: SwapClient,
  username: string,
): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("username", username)
    .maybeSingle<PublicProfile>();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  supabase: SwapClient,
  id: string,
  patch: Partial<Profile>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
