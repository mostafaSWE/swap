"use client";

import { BadgeCheck, Eye, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { localizedName } from "@swap/ui";
import type { Locale, ListingWithRelations } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { ItemArtwork } from "./ItemArtwork";
import { SwapPair } from "./SwapPair";
import { ItemVerifiedBadge } from "./badges";

/**
 * ListingCard — grid card. Same public API (`{ listing }`), so it is a drop-in
 * replacement. Adds the embedded SwapPair (the barter deal at a glance) and the
 * ItemArtwork placeholder fallback.
 */
export function ListingCard({ listing }: { listing: ListingWithRelations }) {
  const locale = useLocale() as Locale;
  const t = useTranslations();

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card group block overflow-hidden text-start transition-all hover:-translate-y-0.5 hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-green/40"
    >
      <div className="relative aspect-square w-full">
        <ItemArtwork listing={listing} className="h-full w-full" />
        <div className="absolute start-2 top-2 flex flex-col gap-1">
          {listing.is_verified_item ? <ItemVerifiedBadge label={t("listing.verifiedItem")} /> : null}
        </div>
        <span
          className={`absolute end-2 top-2 inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] font-bold ${
            listing.condition === "new" ? "bg-navy text-white" : "bg-white/90 text-navy"
          }`}
        >
          {t(`condition.${listing.condition}`)}
        </span>
      </div>

      <div className="space-y-2 p-3">
        <h3 className="truncate text-[15px] font-bold text-ink">{listing.title}</h3>

        <div className="rounded-xl bg-canvas/70 p-2">
          <SwapPair listing={listing} size="sm" />
        </div>

        <div className="flex items-center justify-between pt-0.5 text-[11px] text-muted">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{localizedName(listing.city, locale)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {listing.owner?.is_verified ? <BadgeCheck className="h-3.5 w-3.5 text-green" aria-hidden /> : null}
            <Eye className="h-3.5 w-3.5" aria-hidden />
            {listing.view_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
