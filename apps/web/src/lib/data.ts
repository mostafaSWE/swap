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
  getFollowingListings,
  getListingById,
  getListings,
  getPublicProfileByUsername,
  getRatingsForUser,
  type ListingFilters,
} from "@swap/api";
import type { ListingWithRelations, PublicProfile, RatingWithRater } from "@swap/types";
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
  if (filters.ownerId) rows = rows.filter((l) => l.owner_id === filters.ownerId);
  if (filters.sort === "most_viewed") rows.sort((a, b) => b.view_count - a.view_count);
  return rows;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

/** The viewer's "Following" feed — active listings from the users they follow. */
export async function fetchFollowingListings(userId: string): Promise<ListingWithRelations[]> {
  if (isDemoMode()) return [];
  try {
    return await getFollowingListings(createClient(), userId, { limit: 24 });
  } catch (e) {
    console.error("[data] fetchFollowingListings failed:", e);
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

// NOTE: the detail page + its generateMetadata both call this (two reads per
// render). React's `cache()` would dedupe, but @types/react (18.3) here predates
// the React 19 `cache` export, so it's left as-is — a minor request-scoped cost.
export async function fetchListing(id: string): Promise<ListingWithRelations | null> {
  if (isDemoMode()) return DEMO_LISTINGS.find((l) => l.id === id) ?? null;
  if (!isUuid(id)) return null;
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

/** Post-swap reviews a user has received (newest first), for the profile page. */
export async function fetchUserReviews(userId: string): Promise<RatingWithRater[]> {
  if (isDemoMode()) return [];
  try {
    return await getRatingsForUser(createClient(), userId);
  } catch (e) {
    console.error("[data] fetchUserReviews failed:", e);
    return [];
  }
}
