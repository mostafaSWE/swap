import { notFound } from "next/navigation";
import { Eye, MapPin } from "lucide-react";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { localizedName } from "@swap/ui";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { ListingGallery } from "@/components/ListingGallery";
import { ListingActions } from "@/components/ListingActions";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { VerifiedBadge, ItemVerifiedBadge } from "@/components/badges";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { ReportDialog } from "@/components/ReportDialog";
import { Link } from "@/i18n/navigation";
import { fetchListing } from "@/lib/data";

export default async function ListingDetailsPage({
  params: { locale, id },
}: {
  params: { locale: Locale; id: string };
}) {
  setRequestLocale(locale);
  const listing = await fetchListing(id);
  if (!listing) notFound();

  const activeLocale = (await getLocale()) as Locale;
  const t = await getTranslations("listing");
  const tCond = await getTranslations("condition");

  return (
    <AppShell hideNav>
      <div className="px-4 py-4 pb-10 md:grid md:grid-cols-2 md:gap-8 md:py-8">
        <div className="md:sticky md:top-20 md:self-start">
          <ListingGallery images={listing.images} />
        </div>

        <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-ink">{listing.title}</h1>
            <span className="chip shrink-0">{tCond(listing.condition)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {listing.is_verified_item ? <ItemVerifiedBadge label={t("verifiedItem")} /> : null}
            <span className="flex items-center gap-1 text-sm text-muted">
              <MapPin className="h-4 w-4" aria-hidden />
              {localizedName(listing.city, activeLocale)} · {localizedName(listing.country, activeLocale)}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted">
              <Eye className="h-4 w-4" aria-hidden />
              {listing.view_count}
            </span>
          </div>
        </div>

        {/* Owner */}
        <Link
          href={`/users/${listing.owner.username}`}
          className="card flex items-center gap-3 p-3"
        >
          <ProfileAvatar src={listing.owner.avatar_url} name={listing.owner.full_name} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">{listing.owner.full_name}</span>
              {listing.owner.is_verified ? <VerifiedBadge label={t("verifiedAccount")} /> : null}
            </div>
            <span className="text-sm text-muted">@{listing.owner.username}</span>
          </div>
        </Link>

        <section>
          <h2 className="mb-1 font-bold text-ink">{t("description")}</h2>
          <p className="whitespace-pre-wrap text-sm text-ink/80">{listing.description}</p>
        </section>

        <section className="rounded-card bg-green-light p-3">
          <h2 className="mb-1 font-bold text-green-dark">{t("wantedExchange")}</h2>
          <p className="text-sm text-ink/80">{listing.wanted_exchange}</p>
        </section>

        <SafetyDisclaimer />

        <ListingActions ownerId={listing.owner_id} listingId={listing.id} />

        <div className="flex justify-center pt-2">
          <ReportDialog targetType="listing" targetId={listing.id} />
        </div>
        </div>
      </div>
    </AppShell>
  );
}
