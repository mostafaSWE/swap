/**
 * Admin-side data helpers. **Database-first** — queries run as the (admin) user
 * server-side, so admin RLS policies apply. Demo numbers are returned only when
 * NEXT_PUBLIC_USE_DEMO_DATA=true.
 */
import type { Category, City, Country, Listing, Profile, Report, VerificationRequest } from "@swap/types";
import { createClient } from "./supabase/server";
import { isDemoMode } from "./env";

export interface AdminMetrics {
  totalUsers: number;
  verifiedUsers: number;
  activeListings: number;
  hiddenListings: number;
  pendingReports: number;
  totalConversations: number;
  totalMessages: number;
}

async function count(table: string, build?: (q: any) => any): Promise<number> {
  const supabase = createClient();
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (build) q = build(q);
  const { count } = await q;
  return count ?? 0;
}

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  if (isDemoMode()) {
    return {
      totalUsers: 12,
      verifiedUsers: 5,
      activeListings: 40,
      hiddenListings: 3,
      pendingReports: 3,
      totalConversations: 8,
      totalMessages: 24,
    };
  }
  try {
    const [
      totalUsers,
      verifiedUsers,
      activeListings,
      hiddenListings,
      pendingReports,
      totalConversations,
      totalMessages,
    ] = await Promise.all([
      count("profiles"),
      count("profiles", (q) => q.eq("is_verified", true)),
      count("listings", (q) => q.eq("status", "active")),
      count("listings", (q) => q.eq("status", "hidden")),
      count("reports", (q) => q.eq("status", "pending")),
      count("conversations"),
      count("messages"),
    ]);
    return { totalUsers, verifiedUsers, activeListings, hiddenListings, pendingReports, totalConversations, totalMessages };
  } catch (e) {
    console.error("[admin] fetchAdminMetrics failed:", e);
    return { totalUsers: 0, verifiedUsers: 0, activeListings: 0, hiddenListings: 0, pendingReports: 0, totalConversations: 0, totalMessages: 0 };
  }
}

async function fetchTable<T>(table: string, order = "created_at"): Promise<T[]> {
  try {
    const { data, error } = await createClient()
      .from(table)
      .select("*")
      .order(order, { ascending: table === "categories" || table === "countries" || table === "cities" })
      .limit(300);
    if (error) throw error;
    return (data ?? []) as T[];
  } catch (e) {
    console.error(`[admin] fetch ${table} failed:`, e);
    return [];
  }
}

export const fetchAdminUsers = () => fetchTable<Profile>("profiles");
export const fetchAdminListings = () => fetchTable<Listing>("listings");
export const fetchAdminReports = () => fetchTable<Report>("reports");
export const fetchAdminVerifications = () => fetchTable<VerificationRequest>("verification_requests");

/* Catalog tables — read from the DB so the admin sees actual DB state. */
export const fetchAdminCategories = () => fetchTable<Category>("categories", "sort_order");
export const fetchAdminCountries = () => fetchTable<Country>("countries", "sort_order");
export const fetchAdminCities = () => fetchTable<City>("cities", "sort_order");
