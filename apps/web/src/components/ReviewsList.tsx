import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@swap/ui";
import type { Locale, RatingWithRater } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { ProfileAvatar } from "./ProfileAvatar";
import { RatingStars } from "./RatingStars";

/**
 * Reviews a user has received (spec §3.6) — shown on the public profile, newest
 * first. Renders nothing when there are no reviews, so the section never shows
 * an empty shell.
 */
export function ReviewsList({ reviews }: { reviews: RatingWithRater[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("profile");
  if (!reviews.length) return null;

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-bold text-ink">{t("reviewsTitle", { count: reviews.length })}</h2>
      <ul className="space-y-4">
        {reviews.map((r) => (
          <li key={r.id} className="flex gap-3">
            <Link href={`/users/${r.rater.username}`} className="shrink-0">
              <ProfileAvatar src={r.rater.avatar_url} name={r.rater.full_name} size="sm" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/users/${r.rater.username}`}
                  className="truncate text-sm font-semibold text-ink hover:underline"
                >
                  {r.rater.full_name}
                </Link>
                <span className="shrink-0 text-xs text-muted">{formatDate(r.created_at, locale)}</span>
              </div>
              <RatingStars
                value={r.stars}
                size="sm"
                className="mt-1"
                groupLabel={t("reviewStarsAria", { count: r.stars })}
              />
              {r.comment ? <p className="mt-1 text-sm text-ink/80">{r.comment}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
