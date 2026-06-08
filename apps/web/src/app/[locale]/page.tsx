import { getTranslations, setRequestLocale } from "next-intl/server";
import { TOP_LEVEL_CATEGORIES } from "@swap/config";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import { CategoryPill } from "@/components/CategoryPill";
import { FeaturedCard } from "@/components/FeaturedCard";
import { SectionHeader } from "@/components/SectionHeader";
import { ListingGrid } from "@/components/ListingGrid";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { EmptyState } from "@/components/primitives";
import { fetchFeaturedListings, fetchListings } from "@/lib/data";

export default async function HomePage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");

  const [featured, latest] = await Promise.all([
    fetchFeaturedListings(),
    fetchListings({ sort: "newest", limit: 12 }),
  ]);

  return (
    <AppShell>
      {/* Full-bleed hero with a live example swap */}
      <Hero sample={featured[0]} />

      <div className="mx-auto max-w-6xl space-y-7 px-4 py-7">
        {/* Mobile search (desktop search lives in the top bar) */}
        <div className="md:hidden">
          <SearchBar />
        </div>

        {/* Categories rail */}
        <section>
          <SectionHeader title={t("categories")} actionLabel={tc("viewAll")} href="/listings" />
          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            <CategoryPill
              category={{ name_ar: "الكل", name_en: "All", icon: "open-exchange" }}
              href="/listings"
            />
            {TOP_LEVEL_CATEGORIES.map((c) => (
              <CategoryPill key={c.id} category={c} href={`/listings?category=${c.slug}`} />
            ))}
          </div>
        </section>

        {/* Featured swaps carousel */}
        {featured.length > 0 ? (
          <section>
            <SectionHeader title={t("featured")} actionLabel={tc("viewAll")} href="/listings?sort=most_viewed" />
            <div className="no-scrollbar -mx-4 flex snap-x gap-3.5 overflow-x-auto px-4 pb-1">
              {featured.map((l) => (
                <FeaturedCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Latest listings grid */}
        <section>
          <SectionHeader title={t("latest")} actionLabel={tc("viewAll")} href="/listings" />
          {latest.length > 0 ? (
            <ListingGrid listings={latest} />
          ) : (
            <EmptyState title={t("latest")} description={tn("addListing")} />
          )}
        </section>

        <SafetyDisclaimer />
      </div>
    </AppShell>
  );
}
