/**
 * Admin-side data helpers. Read queries run as the (admin) user, so admin RLS
 * policies apply. When Supabase is unconfigured, returns demo-friendly values
 * so the dashboard skeleton renders in local dev.
 */
import type { Listing, Profile, Report, VerificationRequest } from "@swap/types";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./env";

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
  if (!isSupabaseConfigured()) {
    return {
      totalUsers: 5,
      verifiedUsers: 3,
      activeListings: 12,
      hiddenListings: 0,
      pendingReports: 2,
      totalConversations: 3,
      totalMessages: 6,
    };
  }
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
  return {
    totalUsers,
    verifiedUsers,
    activeListings,
    hiddenListings,
    pendingReports,
    totalConversations,
    totalMessages,
  };
}

export async function fetchAdminUsers(): Promise<Profile[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient()
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function fetchAdminListings(): Promise<Listing[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient()
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function fetchAdminReports(): Promise<Report[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient()
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function fetchAdminVerifications(): Promise<VerificationRequest[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await createClient()
    .from("verification_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}
