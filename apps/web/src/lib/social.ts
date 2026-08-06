/**
 * Social reads (follow / block state, blocked list) — server-side, RLS-protected.
 * Database-first; never throws (logs + returns an empty/false fallback). Mutations
 * go through the backend API client in the button components, not here.
 */
import { getBlockedUsers, getFollowers, getFollowing, isBlocked, isFollowing } from "@swap/api";
import type { PublicProfile, PublicProfileWithFollow } from "@swap/types";
import { createClient } from "./supabase/server";

/** One page of a user's followers (newest first). Block-safe + carries per-row
 *  `is_following` for the viewer (via the `list_follows` RPC). Never throws. */
export async function fetchFollowers(
  userId: string,
  opts?: { limit?: number; offset?: number },
): Promise<PublicProfileWithFollow[]> {
  try {
    return await getFollowers(createClient(), userId, opts);
  } catch (e) {
    console.error("[social] fetchFollowers failed:", e);
    return [];
  }
}

/** One page of the users a person follows (newest first). Block-safe. Never throws. */
export async function fetchFollowing(
  userId: string,
  opts?: { limit?: number; offset?: number },
): Promise<PublicProfileWithFollow[]> {
  try {
    return await getFollowing(createClient(), userId, opts);
  } catch (e) {
    console.error("[social] fetchFollowing failed:", e);
    return [];
  }
}

/** Whether `followerId` currently follows `followingId`. */
export async function fetchIsFollowing(followerId: string, followingId: string): Promise<boolean> {
  try {
    return await isFollowing(createClient(), followerId, followingId);
  } catch {
    return false;
  }
}

/** Whether `blockerId` has blocked `blockedId`. */
export async function fetchIsBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  try {
    return await isBlocked(createClient(), blockerId, blockedId);
  } catch {
    return false;
  }
}

/** Public profiles of the users the caller has blocked (newest first). */
export async function fetchBlockedUsers(userId: string): Promise<PublicProfile[]> {
  try {
    return await getBlockedUsers(createClient(), userId);
  } catch (e) {
    console.error("[social] fetchBlockedUsers failed:", e);
    return [];
  }
}
