import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { CategoryCarousel } from "@/components/CategoryCarousel";
import { SectionHeader } from "@/components/SectionHeader";
import { ListingGrid } from "@/components/ListingGrid";
import { CTAButton } from "@/components/CTAButton";
import { EmptyState } from "@/components/primitives";
import { fetchFeaturedListings, fetchListings } from "@/lib/data";

function Hero() {
  const t = useTranslations("home");
  return (
    <section className="rounded-card bg-navy p-5 text-white">
      <h1 className="text-xl font-extrabold leading-snug">{t("heroTitle")}</h1>
      <p className="mt-1 text-sm text-white/70">{t("heroSubtitle")}</p>
      <div className="mt-4">
        <CTAButton href="/new-listing">
          <Plus className="h-5 w-5" aria-hidden />
          {t("cta")}
        </CTAButton>
      </div>
    </section>
  );
}

export default async function HomePage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tc = await getTranslations("common");

  const [featured, latest] = await Promise.all([
    fetchFeaturedListings(),
    fetchListings({ sort: "newest", limit: 8 }),
  ]);

  return (
    <AppShell>
      <div className="space-y-6 px-4 py-4">
        <SearchBar />
        <Hero />

        <section>
          <SectionHeader title={t("categories")} href="/categories" viewAllLabel={tc("viewAll")} />
          <CategoryCarousel />
        </section>

        {featured.length > 0 ? (
          <section>
            <SectionHeader title={t("featured")} href="/listings?sort=most_viewed" viewAllLabel={tc("viewAll")} />
            <ListingGrid listings={featured} />
          </section>
        ) : null}

        <section>
          <SectionHeader title={t("latest")} href="/listings" viewAllLabel={tc("viewAll")} />
          {latest.length > 0 ? (
            <ListingGrid listings={latest} />
          ) : (
            <EmptyState title={t("latest")} description={tc("loading")} />
          )}
        </section>
      </div>
    </AppShell>
  );
}
