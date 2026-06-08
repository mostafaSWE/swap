import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { ListingGrid } from "@/components/ListingGrid";
import { EmptyState } from "@/components/primitives";
import { CTAButton } from "@/components/CTAButton";
import { getCurrentUser } from "@/lib/auth";
import { fetchUserListings } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";

export default async function MyListingsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("profile");
  const tn = await getTranslations("nav");

  const user = isSupabaseConfigured() ? await getCurrentUser() : null;
  const listings = user ? await fetchUserListings(user.id) : [];

  return (
    <AppShell>
      <div className="space-y-4 px-4 py-4">
        <h1 className="text-xl font-bold text-ink">{tn("myListings")}</h1>
        {listings.length > 0 ? (
          <ListingGrid listings={listings} />
        ) : (
          <EmptyState title={t("noListings")} action={<CTAButton href="/new-listing">{tn("addListing")}</CTAButton>} />
        )}
      </div>
    </AppShell>
  );
}
