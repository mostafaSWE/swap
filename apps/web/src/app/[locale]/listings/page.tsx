import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CATEGORY_BY_SLUG } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { ListingCondition, Locale, SortOption } from "@swap/types";
import { altLinks } from "@/lib/seo";

export async function generateMetadata({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: ActiveFilters;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "listings" });
  const isAr = locale === "ar";
  let title = t("title");
  let path = "/listings"; // free-text search variants canonicalize to the base browse page
  let description = isAr
    ? "تصفّح آلاف الأغراض المتاحة للمقايضة في الخليج على JustSwap — بادل ما لديك بما تحتاجه."
    : "Browse thousands of items available for barter across the GCC on JustSwap — just swap what you have for what you need.";
  if (searchParams.search) {
    title = isAr ? `نتائج البحث: ${searchParams.search}` : `Search: ${searchParams.search}`;
  } else if (searchParams.category) {
    const cat = CATEGORY_BY_SLUG[searchParams.category];
    if (cat) {
      const name = localizedName(cat, locale);
      title = isAr ? `${name} للتبادل` : `${name} for exchange`;
      path = `/listings?category=${searchParams.category}`;
      description = isAr
        ? `تصفّح إعلانات ${name} المتاحة للتبادل في الخليج على JustSwap.`
        : `Browse ${name} listings available for exchange across the GCC on JustSwap.`;
    }
  }
  return {
    title,
    description,
    alternates: altLinks(locale, path),
    openGraph: { title, description, type: "website", url: `/${locale}${path}` },
  };
}
import { AppShell } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { ListingFilters, type ActiveFilters } from "@/components/ListingFilters";
import { ListingGrid } from "@/components/ListingGrid";
import { EmptyState } from "@/components/primitives";
import { fetchListings } from "@/lib/data";

export default async function ListingsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: ActiveFilters;
}) {
  setRequestLocale(locale);
  const t = await getTranslations("listings");

  const listings = await fetchListings({
    search: searchParams.search,
    categoryId: searchParams.category ? CATEGORY_BY_SLUG[searchParams.category]?.id : undefined,
    countryId: searchParams.country,
    cityId: searchParams.city,
    condition: searchParams.condition as ListingCondition | undefined,
    isFeatured: searchParams.featured === "true" ? true : undefined,
    sort: (searchParams.sort as SortOption) ?? "newest",
    limit: 48,
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <SearchBar
          defaultValue={searchParams.search}
          defaultCountry={searchParams.country}
          defaultCity={searchParams.city}
        />
        <ListingFilters active={searchParams} />
        <p className="text-sm text-muted">{t("resultsCount", { count: listings.length })}</p>

        {listings.length > 0 ? (
          <ListingGrid listings={listings} />
        ) : (
          <EmptyState
            icon={<PackageSearch className="h-10 w-10" />}
            title={t("empty")}
          />
        )}
      </div>
    </AppShell>
  );
}
