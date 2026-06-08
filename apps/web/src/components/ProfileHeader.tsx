import { useLocale, useTranslations } from "next-intl";
import { formatDate } from "@swap/ui";
import type { Locale, PublicProfile } from "@swap/types";
import { ProfileAvatar } from "./ProfileAvatar";
import { VerifiedBadge } from "./badges";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="font-bold text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
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
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-ink">{profile.full_name}</h1>
            {profile.is_verified ? <VerifiedBadge label={tl("verifiedAccount")} /> : null}
          </div>
          <p className="text-sm text-muted">@{profile.username}</p>
          <p className="text-xs text-muted">
            {t("memberSince", { date: formatDate(profile.created_at, locale) })}
          </p>
        </div>
      </div>

      {profile.bio ? <p className="mt-3 text-sm text-ink/80">{profile.bio}</p> : null}

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
        <Stat value={profile.listings_count} label={t("listings")} />
        <Stat value={profile.followers_count} label={t("followers")} />
        <Stat value={profile.following_count} label={t("following")} />
      </div>

      {action ? <div className="mt-4">{action}</div> : null}
    </section>
  );
}
