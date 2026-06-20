/**
 * Social reads (follow / block state, blocked list) — server-side, RLS-protected.
 * Database-first; never throws (logs + returns an empty/false fallback). Mutations
 * go through the backend API client in the button components, not here.
 */
import { getBlockedUsers, isBlocked, isFollowing } from "@swap/api";
import type { PublicProfile } from "@swap/types";
import { createClient } from "./supabase/server";

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
