import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site-url";

// Computed per-request (never at build time) so `next build` needs no DB env.
export const dynamic = "force-dynamic";

const baseUrl = getSiteUrl();
const locales = ["ar", "en"] as const;

// Public, indexable static routes (mirrored per locale).
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
  "/login",
  "/register",
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
  }

  // Dynamic listing URLs — best-effort. A missing key or a DB hiccup must never
  // break the sitemap, so we fall back to the static routes already collected.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey) {
    try {
      const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
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
      // Swallow — the static routes above are already in `entries`.
    }
  }

  return entries;
}
