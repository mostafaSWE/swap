/**
 * Server-side data layer for read pages. **Database-first.**
 *
 * Reads go directly to Supabase Postgres (RLS-protected) via the shared typed
 * query functions in @swap/api. Demo data is returned ONLY when
 * NEXT_PUBLIC_USE_DEMO_DATA=true (development convenience). On a real query
 * error we log and return an empty result — never silent fake data.
 *
 * Mutations do NOT live here; they go through the backend API (@swap/api REST
 * client) — see the listing/profile/report/chat action components.
 */
import {
  getFeaturedListings,
  getListingById,
  getListings,
  getPublicProfileByUsername,
  type ListingFilters,
} from "@swap/api";
import type { ListingWithRelations, PublicProfile } from "@swap/types";
import { createClient } from "./supabase/server";
import { isDemoMode } from "./env";
import { DEMO_LISTINGS } from "./demo-data";

function applyDemoFilters(filters: ListingFilters): ListingWithRelations[] {
  let rows = [...DEMO_LISTINGS];
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter((l) => l.title.toLowerCase().includes(q));
  }
  if (filters.categoryId) rows = rows.filter((l) => l.category_id === filters.categoryId);
  if (filters.countryId) rows = rows.filter((l) => l.country_id === filters.countryId);
  if (filters.cityId) rows = rows.filter((l) => l.city_id === filters.cityId);
  if (filters.condition) rows = rows.filter((l) => l.condition === filters.condition);
  if (filters.verifiedOnly) rows = rows.filter((l) => l.owner.is_verified);
  if (filters.ownerId) rows = rows.filter((l) => l.owner_id === filters.ownerId);
  if (filters.sort === "most_viewed") rows.sort((a, b) => b.view_count - a.view_count);
  return rows;
}

export async function fetchListings(filters: ListingFilters = {}): Promise<ListingWithRelations[]> {
  if (isDemoMode()) return applyDemoFilters(filters);
  try {
    return await getListings(createClient(), filters);
  } catch (e) {
    console.error("[data] fetchListings failed:", e);
    return [];
  }
}

export async function fetchFeaturedListings(): Promise<ListingWithRelations[]> {
  if (isDemoMode()) return DEMO_LISTINGS.filter((l) => l.is_featured);
  try {
    return await getFeaturedListings(createClient());
  } catch (e) {
    console.error("[data] fetchFeaturedListings failed:", e);
    return [];
  }
}

export async function fetchListing(id: string): Promise<ListingWithRelations | null> {
  if (isDemoMode()) return DEMO_LISTINGS.find((l) => l.id === id) ?? null;
  try {
    return await getListingById(createClient(), id);
  } catch (e) {
    console.error("[data] fetchListing failed:", e);
    return null;
  }
}

export async function fetchPublicProfile(username: string): Promise<PublicProfile | null> {
  if (isDemoMode()) {
    return DEMO_LISTINGS.find((l) => l.owner.username === username)?.owner ?? null;
  }
  try {
    return await getPublicProfileByUsername(createClient(), username);
  } catch (e) {
    console.error("[data] fetchPublicProfile failed:", e);
    return null;
  }
}

/** Listings owned by a user (active only via RLS for the public). */
export async function fetchUserListings(ownerId: string): Promise<ListingWithRelations[]> {
  if (isDemoMode()) return DEMO_LISTINGS.filter((l) => l.owner_id === ownerId);
  try {
    return await getListings(createClient(), { ownerId });
  } catch (e) {
    console.error("[data] fetchUserListings failed:", e);
    return [];
  }
}
