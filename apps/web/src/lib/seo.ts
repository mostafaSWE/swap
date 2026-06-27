import type { Locale } from "@swap/types";
import { getSiteUrl } from "./site-url";

/**
 * SEO helpers — canonical/hreflang builders + JSON-LD generators.
 *
 * Brand rule: the one-word "JustSwap" is the canonical name (titles, H1, WebSite
 * schema name). The two-word "Just Swap" lives ONLY in body copy / descriptions and
 * the Organization `alternateName`, so we capture "just swap" search traffic without
 * diluting the branding.
 */
export const BRAND = {
  name: "JustSwap",
  alternateName: "Just Swap",
} as const;

/** Branded landscape fallback share image (1200×630) for pages without their own. */
export const OG_DEFAULT = "/brand/og-default.png";

const LOCALES: Locale[] = ["ar", "en"];
const DEFAULT_LOCALE: Locale = "ar";

/**
 * Per-page canonical + hreflang alternates. `pathNoLocale` is the path WITHOUT the
 * locale prefix (e.g. "" for home, "/listings/123"). Returned values are relative —
 * Next resolves them against `metadataBase` (the site URL).
 */
export function altLinks(
  locale: Locale,
  pathNoLocale = "",
): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = `/${l}${pathNoLocale}`;
  languages["x-default"] = `/${DEFAULT_LOCALE}${pathNoLocale}`;
  return { canonical: `/${locale}${pathNoLocale}`, languages };
}

/** Absolute URL (JSON-LD requires absolute URLs). `path` includes the locale prefix. */
export function abs(path = ""): string {
  const base = getSiteUrl();
  return path ? `${base}${path.startsWith("/") ? "" : "/"}${path}` : base;
}

/** WebSite schema + a SearchAction (enables the Google sitelinks search box). */
export function websiteJsonLd(locale: Locale) {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    url: site,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${site}/${locale}/listings?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Organization schema — name + alternateName + logo, so Google can show the mark. */
export function organizationJsonLd() {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    alternateName: BRAND.alternateName,
    url: site,
    logo: `${site}/brand/justswap-mark.png`,
  };
}

/** BreadcrumbList from `{ name, path }` items (path includes the locale prefix). */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

/** Product schema for a listing (barter — no price, so no Offer). */
export function productJsonLd(opts: {
  name: string;
  description?: string;
  images: string[];
  category?: string;
  condition: "new" | "used";
  path: string;
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    url: abs(opts.path),
    brand: { "@type": "Brand", name: BRAND.name },
    itemCondition:
      opts.condition === "new"
        ? "https://schema.org/NewCondition"
        : "https://schema.org/UsedCondition",
  };
  if (opts.description) data.description = opts.description;
  if (opts.images.length) data.image = opts.images;
  if (opts.category) data.category = opts.category;
  return data;
}
