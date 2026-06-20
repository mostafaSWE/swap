import type { MetadataRoute } from "next";

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

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
