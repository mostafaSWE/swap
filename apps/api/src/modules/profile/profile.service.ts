import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { ListingWithRelations, Profile, PublicProfile } from "@swap/types";
import type { UpdateProfileInput } from "@swap/validation";
import { SupabaseService } from "../../common/supabase/supabase.service";
import { LISTING_SELECT, PUBLIC_PROFILE_COLUMNS } from "../../common/db.constants";
import { assertNotBlocked } from "../../common/blocks.util";

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
    await assertNotBlocked(this.supabase.admin, followerId, followingId);
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

  /** Block a user: hides each party's listings from the other + prevents messaging (spec §3.8). */
  async block(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) throw new BadRequestException("Cannot block yourself");
    // Inserting the block row severs any follow edge in BOTH directions via the
    // `blocks_sever_follows` DB trigger (migration 0009) — so it happens for
    // every write path (this service AND the direct-RLS web fallback), not just
    // here. Use a plain insert (ignore duplicates) so a re-block still fires the
    // INSERT trigger only on a genuinely new row.
    const { error } = await this.supabase.admin
      .from("blocks")
      .upsert({ blocker_id: blockerId, blocked_id: blockedId }, {
        onConflict: "blocker_id,blocked_id",
        ignoreDuplicates: true,
      });
    if (error) throw error;
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await this.supabase.admin
      .from("blocks")
      .delete()
      .eq("blocker_id", blockerId)
      .eq("blocked_id", blockedId);
    if (error) throw error;
  }

  /** Public profiles of the users the caller has blocked (newest first). */
  async blockedUsers(userId: string): Promise<PublicProfile[]> {
    const { data, error } = await this.supabase.admin
      .from("blocks")
      .select(`created_at, blocked:profiles!blocks_blocked_id_fkey(${PUBLIC_PROFILE_COLUMNS})`)
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? [])
      .map((row) => (row as unknown as { blocked: PublicProfile | null }).blocked)
      .filter((p): p is PublicProfile => Boolean(p));
  }
}
