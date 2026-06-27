import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { TOP_LEVEL_CATEGORIES } from "@swap/config";
import { getSiteUrl } from "@/lib/site-url";

// Computed per-request (never at build time) so `next build` needs no DB env.
export const dynamic = "force-dynamic";

const baseUrl = getSiteUrl();
const locales = ["ar", "en"] as const;

// Public, indexable static routes (mirrored per locale). Auth/utility pages
// (login/register) are crawlable but intentionally kept out of the sitemap.
const staticPaths = [
  "",
  "/listings",
  "/categories",
  "/legal",
  "/safety",
  "/disclaimer",
  "/privacy",
  "/terms",
  "/support",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of staticPaths) {
      entries.push({
        url: `${baseUrl}/${locale}${path}`,
        changeFrequency: path === "" ? "daily" : "weekly",
        priority: path === "" ? 1 : 0.6,
      });
    }
    // Category browse pages (filters on /listings — there's no dedicated route).
    for (const cat of TOP_LEVEL_CATEGORIES) {
      entries.push({
        url: `${baseUrl}/${locale}/listings?category=${cat.slug}`,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  // Dynamic URLs — best-effort. A missing key or DB hiccup must never break the
  // sitemap, so each block falls back to whatever has already been collected.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

    // Active listing detail pages.
    try {
      const { data } = await supabase
        .from("listings")
        .select("id, updated_at")
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(5000);
      for (const row of data ?? []) {
        for (const locale of locales) {
          entries.push({
            url: `${baseUrl}/${locale}/listings/${row.id}`,
            lastModified: row.updated_at ? new Date(row.updated_at as string) : undefined,
            changeFrequency: "weekly",
            priority: 0.7,
          });
        }
      }
    } catch {
      /* keep what we have */
    }

    // Public user profiles (skip banned / suspended accounts).
    try {
      const { data } = await supabase
        .from("profiles")
        .select("username, updated_at")
        .eq("is_banned", false)
        .eq("is_suspended", false)
        .order("updated_at", { ascending: false })
        .limit(5000);
      for (const row of data ?? []) {
        if (!row.username) continue;
        for (const locale of locales) {
          entries.push({
            url: `${baseUrl}/${locale}/users/${row.username}`,
            lastModified: row.updated_at ? new Date(row.updated_at as string) : undefined,
            changeFrequency: "weekly",
            priority: 0.5,
          });
        }
      }
    } catch {
      /* keep what we have */
    }
  }

  return entries;
}
