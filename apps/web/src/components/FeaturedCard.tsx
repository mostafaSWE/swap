"use client";

import Image from "next/image";
import { MapPin, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { localizedName } from "@swap/ui";
import type { Locale, ListingWithRelations } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { ItemArtwork } from "./ItemArtwork";
import { SwapPair } from "./SwapPair";
import { ItemVerifiedBadge } from "./badges";

/** Wide card for the home "Featured swaps" horizontal carousel. */
export function FeaturedCard({ listing }: { listing: ListingWithRelations }) {
  const locale = useLocale() as Locale;
  const t = useTranslations();

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card group relative w-[290px] shrink-0 snap-start overflow-hidden text-start transition-all hover:shadow-elevated"
    >
      <div className="relative h-40 w-full">
        <ItemArtwork listing={listing} className="h-full w-full" sizes="290px" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5">
          <span className="inline-flex items-center gap-1 rounded-pill bg-white/95 px-2 py-0.5 text-[11px] font-bold text-navy shadow-sm">
            <Sparkles className="h-3 w-3 text-green" aria-hidden />
            {t("home.featured")}
          </span>
          {listing.is_verified_item ? <ItemVerifiedBadge label={t("listing.verifiedItem")} /> : null}
        </div>
      </div>

      <div className="space-y-2.5 p-3.5">
        <h3 className="truncate text-base font-bold text-ink">{listing.title}</h3>
        <SwapPair listing={listing} size="md" />
        <div className="flex items-center gap-2 border-t border-line pt-2.5">
          {listing.owner?.avatar_url ? (
            <Image
              src={listing.owner.avatar_url}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <span className="h-6 w-6 rounded-full bg-line" />
          )}
          <span className="truncate text-xs font-medium text-ink">{listing.owner?.full_name}</span>
          <span className="ms-auto flex shrink-0 items-center gap-1 text-[11px] text-muted">
            <MapPin className="h-3 w-3" aria-hidden />
            {localizedName(listing.city, locale)}
          </span>
        </div>
      </div>
    </Link>
  );
}
