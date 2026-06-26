import { CalendarDays, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDate } from "@swap/ui";
import type { Locale, PublicProfile } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { ProfileAvatar } from "./ProfileAvatar";
import { RatingBadge, SwapCountBadge } from "./badges";
import { FollowButton } from "./FollowButton";

/**
 * The person behind the listing. Surfaces only real trust signals from the
 * public profile — completed swaps, rating, and join date (no invented numbers)
 * — links to the full profile, and hosts the Follow action (moved off the CTA
 * card so the primary call-to-action stays uncluttered).
 */
export function SellerCard({
  owner,
  locale,
  isOwner,
  initialFollowing,
}: {
  owner: PublicProfile;
  locale: Locale;
  isOwner: boolean;
  initialFollowing: boolean;
}) {
  const t = useTranslations("listing");
  const tp = useTranslations("profile");
  const profileHref = `/users/${owner.username}`;

  return (
    <section className="rounded-card border border-line bg-surface p-4 shadow-card">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">{t("aboutSeller")}</p>

      <div className="flex items-center gap-3">
        <Link href={profileHref} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
          <ProfileAvatar src={owner.avatar_url} name={owner.full_name} size="lg" />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={profileHref}
            className="block truncate font-semibold text-ink transition-colors hover:text-accent"
          >
            {owner.full_name}
          </Link>
          <span className="block truncate text-sm text-muted">@{owner.username}</span>
        </div>

        {isOwner ? null : (
          <FollowButton userId={owner.id} initialFollowing={initialFollowing} fullWidth={false} className="px-4 py-2.5" />
        )}
      </div>

      {/* Real trust signals only. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SwapCountBadge count={owner.completed_swaps_count} label={t("completedSwaps")} />
        <RatingBadge
          rating={owner.rating}
          count={owner.ratings_count}
          ariaLabel={t("ratingAria", {
            rating: Number(owner.rating ?? 0).toFixed(1),
            count: owner.ratings_count,
          })}
        />
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {tp("memberSince", { date: formatDate(owner.created_at, locale) })}
        </span>
      </div>

      {owner.bio ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{owner.bio}</p>
      ) : null}

      <Link
        href={profileHref}
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
      >
        {t("viewProfile")}
        <ChevronRight className="h-4 w-4 rtl-flip" aria-hidden />
      </Link>
    </section>
  );
}
