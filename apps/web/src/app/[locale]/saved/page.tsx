import { Bookmark } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { ListingGrid } from "@/components/ListingGrid";
import { EmptyState } from "@/components/primitives";
import { CTAButton } from "@/components/CTAButton";
import { getCurrentUser } from "@/lib/auth";
import { fetchSavedListings } from "@/lib/saved";

export default async function SavedPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const tn = await getTranslations("nav");
  const t = await getTranslations("listings");

  const user = await getCurrentUser();
  if (!user) {
    return (
      <AppShell>
        <EmptyState
          icon={<Bookmark className="h-10 w-10" />}
          title={tn("saved")}
          action={<CTAButton href="/login">{tn("login")}</CTAButton>}
        />
      </AppShell>
    );
  }

  const listings = await fetchSavedListings(user.id);

  return (
    <AppShell>
      <div className="space-y-4 px-4 py-4">
        <h1 className="text-xl font-bold text-ink">{tn("saved")}</h1>
        {listings.length > 0 ? (
          <ListingGrid listings={listings} />
        ) : (
          <EmptyState
            icon={<Bookmark className="h-10 w-10" />}
            title={t("empty")}
            action={<CTAButton href="/listings">{tn("home")}</CTAButton>}
          />
        )}
      </div>
    </AppShell>
  );
}
