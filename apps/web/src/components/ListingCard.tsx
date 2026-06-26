"use client";

import { Eye, MapPin, Repeat2, Star } from "lucide-react";
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
      className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface text-start shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-night sm:aspect-[4/3]">
        <ItemArtwork
          listing={listing}
          sizes="(max-width: 640px) 82vw, (max-width: 1024px) 33vw, 260px"
          className="h-full w-full transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
          <div className="flex gap-1.5 flex-wrap">
            <span className="rounded-pill bg-night/70 px-2.5 py-1 text-[11px] font-bold text-ink shadow-sm ring-1 ring-white/10 backdrop-blur-sm">
              {t(`condition.${listing.condition}`)}
            </span>
            {listing.is_featured ? (
              <span className="rounded-pill bg-amber-500 px-2 py-1 text-[11px] font-bold text-white shadow-sm flex items-center gap-0.5 shadow-glow ring-1 ring-amber-400/20 backdrop-blur-sm">
                <Star className="h-3 w-3 fill-current text-white" aria-hidden />
                {t("listing.featured")}
              </span>
            ) : null}
          </div>
          {listing.category ? (
            <span className="max-w-[58%] truncate rounded-pill bg-accent/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-sm">
              {localizedName(listing.category, locale)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5 sm:gap-3 sm:p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-extrabold leading-6 text-ink">{listing.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{localizedName(listing.city, locale)}</span>
          </p>
        </div>

        <div className="rounded-2xl bg-canvas p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-accent">
            <Repeat2 className="h-3.5 w-3.5" aria-hidden />
            {t("listing.wantedExchange")}
          </p>
          <p className="line-clamp-2 text-sm leading-5 text-ink">
            {listing.wanted_exchange === "__any__"
              ? t("listing.openToAnyExchange")
              : listing.wanted_exchange || t("listing.openToOffers")}
          </p>
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-line pt-2.5 sm:pt-3">
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
