import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@swap/ui";
import type { Locale, PublicProfile } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { ProfileAvatar } from "./ProfileAvatar";
import { RatingBadge, SwapCountBadge } from "./badges";

function Stat({ value, label, href }: { value: number; label: string; href?: string }) {
  const inner = (
    <>
      <div className="font-bold text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </>
  );
  // Followers/Following are interactive — they open the connections list. The others
  // are plain figures. Keep the same visual footprint so the row stays aligned.
  return href ? (
    <Link
      href={href}
      className="rounded-lg py-0.5 text-center transition-colors hover:bg-line/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
    >
      {inner}
    </Link>
  ) : (
    <div className="text-center">{inner}</div>
  );
}

/** Presentational profile header used by the public and own-profile pages. */
export function ProfileHeader({
  profile,
  action,
}: {
  profile: PublicProfile;
  action?: React.ReactNode;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("profile");
  const tl = useTranslations("listing");

  return (
    <section className="card p-4">
      <div className="flex items-center gap-3">
        <ProfileAvatar src={profile.avatar_url} name={profile.full_name} size="lg" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-ink">{profile.full_name}</h1>
            <SwapCountBadge count={profile.completed_swaps_count} label={tl("completedSwaps")} />
            <RatingBadge
              rating={profile.rating}
              count={profile.ratings_count}
              ariaLabel={tl("ratingAria", {
                rating: Number(profile.rating ?? 0).toFixed(1),
                count: profile.ratings_count,
              })}
            />
          </div>
          <p className="text-sm text-muted">@{profile.username}</p>
          <p className="text-xs text-muted">
            {t("memberSince", { date: formatDate(profile.created_at, locale) })}
          </p>
        </div>
      </div>

      {profile.bio ? <p className="mt-3 text-sm text-ink/80">{profile.bio}</p> : null}

      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-3">
        <Stat value={profile.completed_swaps_count} label={tl("completedSwaps")} />
        <Stat value={profile.listings_count} label={t("listings")} />
        <Stat
          value={profile.followers_count}
          label={t("followers")}
          href={`/users/${profile.username}/connections?tab=followers`}
        />
        <Stat
          value={profile.following_count}
          label={t("following")}
          href={`/users/${profile.username}/connections?tab=following`}
        />
      </div>

      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
