/**
 * Saved-listings reads (server-side, RLS-protected). Database-first.
 */
import { getSavedListings, isListingSaved } from "@swap/api";
import type { ListingWithRelations } from "@swap/types";
import { createClient } from "./supabase/server";

export async function fetchSavedListings(userId: string): Promise<ListingWithRelations[]> {
  try {
    return await getSavedListings(createClient(), userId);
  } catch (e) {
    console.error("[saved] fetchSavedListings failed:", e);
    return [];
  }
}

export async function fetchIsSaved(userId: string, listingId: string): Promise<boolean> {
  try {
    return await isListingSaved(createClient(), userId, listingId);
  } catch {
    return false;
  }
}
