import Image from "next/image";
import { Eye, ImageOff, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { localizedName } from "@swap/ui";
import type { Locale, ListingWithRelations } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { ItemVerifiedBadge, VerifiedBadge } from "./badges";

export function ListingCard({ listing }: { listing: ListingWithRelations }) {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const cover = listing.images?.[0]?.image_url;

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="card group block overflow-hidden transition-shadow hover:shadow-elevated"
    >
      <div className="relative aspect-square w-full bg-canvas">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            sizes="(max-width: 480px) 50vw, 240px"
            className="object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <ImageOff className="h-8 w-8" aria-hidden />
          </div>
        )}
        <div className="absolute start-2 top-2 flex flex-col gap-1">
          {listing.is_verified_item ? (
            <ItemVerifiedBadge label={t("listing.verifiedItem")} />
          ) : null}
        </div>
        <span className="absolute end-2 top-2 chip !px-2 !py-0.5 text-xs">
          {t(`condition.${listing.condition}`)}
        </span>
      </div>

      <div className="space-y-1.5 p-3">
        <h3 className="line-clamp-1 font-semibold text-ink">{listing.title}</h3>

        <div className="flex items-center gap-1 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          <span className="line-clamp-1">
            {localizedName(listing.city, locale)} · {localizedName(listing.country, locale)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          {listing.owner?.is_verified ? (
            <VerifiedBadge label={t("listing.verifiedAccount")} />
          ) : (
            <span className="text-xs text-muted">@{listing.owner?.username}</span>
          )}
          <span className="flex items-center gap-1 text-xs text-muted">
            <Eye className="h-3.5 w-3.5" aria-hidden />
            {listing.view_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
