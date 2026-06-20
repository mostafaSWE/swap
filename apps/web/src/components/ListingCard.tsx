"use client";

import { Eye, MapPin, Repeat2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { localizedName } from "@swap/ui";
import type { Locale, ListingWithRelations } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { ItemArtwork } from "./ItemArtwork";
import { ProfileAvatar } from "./ProfileAvatar";

export function ListingCard({ listing }: { listing: ListingWithRelations }) {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const ownerName = listing.owner?.full_name ?? listing.owner?.username ?? "";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-white text-start shadow-card transition-all hover:-translate-y-0.5 hover:border-green/40 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green/40"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-canvas">
        <ItemArtwork listing={listing} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span className="rounded-pill bg-white/95 px-2.5 py-1 text-[11px] font-bold text-navy shadow-sm">
            {t(`condition.${listing.condition}`)}
          </span>
          {listing.category ? (
            <span className="max-w-[58%] truncate rounded-pill bg-navy/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              {localizedName(listing.category, locale)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-h-[52px]">
          <h3 className="line-clamp-2 text-base font-extrabold leading-6 text-ink">{listing.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{localizedName(listing.city, locale)}</span>
          </p>
        </div>

        <div className="rounded-2xl bg-canvas p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-green-dark">
            <Repeat2 className="h-3.5 w-3.5" aria-hidden />
            {t("listing.wantedExchange")}
          </p>
          <p className="line-clamp-2 min-h-[40px] text-sm leading-5 text-ink">{listing.wanted_exchange}</p>
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-line pt-3">
          <ProfileAvatar src={listing.owner?.avatar_url} name={ownerName} size="sm" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{ownerName}</span>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            {listing.view_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
