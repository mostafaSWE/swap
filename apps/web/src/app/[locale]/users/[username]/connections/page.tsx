import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { ConnectionsList } from "@/components/ConnectionsList";
import { Link } from "@/i18n/navigation";
import { fetchPublicProfile } from "@/lib/data";
import { fetchFollowers, fetchFollowing } from "@/lib/social";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 30;

type Direction = "followers" | "following";

function normalizeTab(tab?: string): Direction {
  return tab === "following" ? "following" : "followers";
}

export const metadata: Metadata = { robots: { index: false, follow: true } };

/**
 * Followers / Following list for a user — `/users/{username}/connections?tab=followers`.
 * A segmented header switches direction; the list is block-safe and paginated via the
 * shared `list_follows` RPC. Mirrors the mobile connections screen so both surfaces
 * behave identically.
 */
export default async function ConnectionsPage({
  params: { locale, username },
  searchParams,
}: {
  params: { locale: Locale; username: string };
  searchParams: { tab?: string };
}) {
  setRequestLocale(locale);
  const profile = await fetchPublicProfile(username);
  if (!profile) notFound();

  const direction = normalizeTab(searchParams.tab);
  const t = await getTranslations("profile");
  const viewer = await getCurrentUser();

  const initial =
    direction === "followers"
      ? await fetchFollowers(profile.id, { limit: PAGE_SIZE })
      : await fetchFollowing(profile.id, { limit: PAGE_SIZE });

  const tabClass = (active: boolean) =>
    cn(
      "flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors",
      active ? "bg-elevated text-ink shadow-sm" : "text-muted hover:text-ink",
    );

  return (
    <AppShell>
      <div className="space-y-4 px-4 py-4">
        <div>
          <h1 className="text-lg font-bold text-ink">{profile.full_name}</h1>
          <p className="text-sm text-muted">@{profile.username}</p>
        </div>

        <div className="flex gap-1 rounded-2xl border border-line bg-surface p-1" role="tablist">
          <Link
            href={`/users/${username}/connections?tab=followers`}
            role="tab"
            aria-selected={direction === "followers"}
            className={tabClass(direction === "followers")}
          >
            {t("followers")} {profile.followers_count}
          </Link>
          <Link
            href={`/users/${username}/connections?tab=following`}
            role="tab"
            aria-selected={direction === "following"}
            className={tabClass(direction === "following")}
          >
            {t("following")} {profile.following_count}
          </Link>
        </div>

        <ConnectionsList
          targetId={profile.id}
          direction={direction}
          initial={initial}
          viewerId={viewer?.id ?? null}
          pageSize={PAGE_SIZE}
        />
      </div>
    </AppShell>
  );
}
