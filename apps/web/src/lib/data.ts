/**
 * Server-side data layer for read pages.
 *
 * When Supabase is configured, queries hit the database (RLS-protected).
 * Otherwise we fall back to demo data so the UI renders out-of-the-box.
 * This keeps `pnpm dev` working before you set up a Supabase project.
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
import { isSupabaseConfigured } from "./env";
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
  if (filters.sort === "most_viewed") rows.sort((a, b) => b.view_count - a.view_count);
  return rows;
}

export async function fetchListings(filters: ListingFilters = {}): Promise<ListingWithRelations[]> {
  if (!isSupabaseConfigured()) return applyDemoFilters(filters);
  try {
    return await getListings(createClient(), filters);
  } catch {
    return applyDemoFilters(filters);
  }
}

export async function fetchFeaturedListings(): Promise<ListingWithRelations[]> {
  if (!isSupabaseConfigured()) return DEMO_LISTINGS.filter((l) => l.is_featured);
  try {
    return await getFeaturedListings(createClient());
  } catch {
    return DEMO_LISTINGS.filter((l) => l.is_featured);
  }
}

export async function fetchListing(id: string): Promise<ListingWithRelations | null> {
  if (!isSupabaseConfigured()) return DEMO_LISTINGS.find((l) => l.id === id) ?? null;
  try {
    return await getListingById(createClient(), id);
  } catch {
    return DEMO_LISTINGS.find((l) => l.id === id) ?? null;
  }
}

export async function fetchPublicProfile(username: string): Promise<PublicProfile | null> {
  if (!isSupabaseConfigured()) {
    const listing = DEMO_LISTINGS.find((l) => l.owner.username === username);
    return listing?.owner ?? null;
  }
  try {
    return await getPublicProfileByUsername(createClient(), username);
  } catch {
    return null;
  }
}

/** Listings owned by a user (active only via RLS for the public). */
export async function fetchUserListings(ownerId: string): Promise<ListingWithRelations[]> {
  if (!isSupabaseConfigured()) return DEMO_LISTINGS.filter((l) => l.owner_id === ownerId);
  try {
    return await getListings(createClient(), { ownerId });
  } catch {
    return DEMO_LISTINGS.filter((l) => l.owner_id === ownerId);
  }
}
