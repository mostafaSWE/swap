import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CATEGORY_BY_SLUG } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { ListingCondition, Locale, SortOption } from "@swap/types";

export async function generateMetadata({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: ActiveFilters;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "listings" });
  let title = t("title");
  if (searchParams.search) {
    title = `“${searchParams.search}”`;
  } else if (searchParams.category) {
    const cat = CATEGORY_BY_SLUG[searchParams.category];
    if (cat) title = localizedName(cat, locale);
  }
  return { title, openGraph: { title } };
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
    sort: (searchParams.sort as SortOption) ?? "newest",
    limit: 48,
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <SearchBar defaultValue={searchParams.search} />
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
