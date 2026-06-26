/**
 * Canonical public base URL of the site, without a trailing slash.
 *
 * Reads NEXT_PUBLIC_APP_URL — set this in Vercel → Project Settings → Environment
 * Variables for every environment (production + previews). It drives `metadataBase`
 * (canonical + OpenGraph URLs), `robots.txt`, and `sitemap.xml`, so a missing value
 * silently ships `localhost` URLs to crawlers and social unfurls.
 *
 * To make that misconfiguration loud instead of silent, we warn in production when
 * the var is unset; in development we fall back to localhost:3000 for convenience.
 */
const DEV_FALLBACK = "http://localhost:3000";

let warned = false;

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production" && !warned) {
    warned = true;
    console.warn(
      "[site-url] NEXT_PUBLIC_APP_URL is not set — falling back to " +
        `${DEV_FALLBACK}. Canonical URLs, robots.txt and sitemap.xml will point at ` +
        "localhost. Set NEXT_PUBLIC_APP_URL in your Vercel project settings.",
    );
  }
  return DEV_FALLBACK;
}
