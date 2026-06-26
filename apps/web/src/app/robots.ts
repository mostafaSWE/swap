import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const baseUrl = getSiteUrl();

// Private / auth-gated areas that should never be indexed (both locales).
const PRIVATE = ["admin", "messages", "settings", "onboarding", "saved", "my-listings", "profile"];
const disallow = ["/api/", ...PRIVATE.flatMap((p) => [`/ar/${p}`, `/en/${p}`])];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
