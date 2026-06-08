import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { ListingWithRelations, Profile, PublicProfile } from "@swap/types";
import type { UpdateProfileInput } from "@swap/validation";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { LISTING_SELECT, PUBLIC_PROFILE_COLUMNS } from "../../common/db.constants";

@Injectable()
export class ProfileService {
  constructor(private readonly supabase: SupabaseService) {}

  async me(userId: string): Promise<Profile> {
    const { data, error } = await this.supabase.admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("Profile not found");
    return data;
  }

  async updateMe(userId: string, input: UpdateProfileInput): Promise<Profile> {
    // username uniqueness is enforced by a DB constraint; surface a clean error.
    const { data, error } = await this.supabase.admin
      .from("profiles")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("*")
      .maybeSingle();
    if (error) {
      if (error.code === "23505") throw new BadRequestException("Username already taken");
      throw error;
    }
    if (!data) throw new NotFoundException("Profile not found");
    return data;
  }

  async publicProfile(username: string): Promise<PublicProfile> {
    const { data, error } = await this.supabase.admin
      .from("profiles")
      .select(PUBLIC_PROFILE_COLUMNS)
      .eq("username", username)
      .maybeSingle<PublicProfile>();
    if (error) throw error;
    if (!data) throw new NotFoundException("User not found");
    return data;
  }

  /** Listings the user has saved (newest first). */
  async savedListings(userId: string): Promise<ListingWithRelations[]> {
    const { data, error } = await this.supabase.admin
      .from("saved_listings")
      .select(`created_at, listing:listings(${LISTING_SELECT})`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? [])
      .map((row) => (row as unknown as { listing: ListingWithRelations | null }).listing)
      .filter((l): l is ListingWithRelations => Boolean(l));
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) throw new BadRequestException("Cannot follow yourself");
    const { error } = await this.supabase.admin
      .from("follows")
      .upsert({ follower_id: followerId, following_id: followingId }, { onConflict: "follower_id,following_id" });
    if (error) throw error;
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const { error } = await this.supabase.admin
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    if (error) throw error;
  }
}
