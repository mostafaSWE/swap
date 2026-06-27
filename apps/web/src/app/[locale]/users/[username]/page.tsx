import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ListingGrid } from "@/components/ListingGrid";
import { EmptyState } from "@/components/primitives";
import { ProfileActions } from "@/components/ProfileActions";
import { ReviewsList } from "@/components/ReviewsList";
import { fetchPublicProfile, fetchUserListings, fetchUserReviews } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { fetchIsBlocked, fetchIsFollowing } from "@/lib/social";
import { altLinks } from "@/lib/seo";

export async function generateMetadata({
  params: { locale, username },
}: {
  params: { locale: Locale; username: string };
}): Promise<Metadata> {
  const profile = await fetchPublicProfile(username);
  if (!profile) return {};
  const isAr = locale === "ar";
  const name = profile.full_name || `@${profile.username}`;
  const title = isAr ? `${name} · إعلانات للتبادل` : `${name} · items for exchange`;
  const description = (
    (profile.bio ?? "").trim() ||
    (isAr
      ? `تصفّح إعلانات ${name} المتاحة للتبادل على JustSwap.`
      : `Browse ${name}'s items available for exchange on JustSwap — just swap what you have for what you need.`)
  ).slice(0, 160);
  const images = profile.avatar_url ? [profile.avatar_url] : undefined;
  return {
    title,
    description,
    alternates: altLinks(locale, `/users/${username}`),
    openGraph: { title, description, images, type: "profile", url: `/${locale}/users/${username}` },
    twitter: { card: "summary", title, description, images },
  };
}

export default async function PublicProfilePage({
  params: { locale, username },
}: {
  params: { locale: Locale; username: string };
}) {
  setRequestLocale(locale);
  const profile = await fetchPublicProfile(username);
  if (!profile) notFound();

  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === profile.id;
  const [listings, reviews, initialFollowing, initialBlocked] = await Promise.all([
    fetchUserListings(profile.id),
    fetchUserReviews(profile.id),
    viewer && !isSelf ? fetchIsFollowing(viewer.id, profile.id) : Promise.resolve(false),
    viewer && !isSelf ? fetchIsBlocked(viewer.id, profile.id) : Promise.resolve(false),
  ]);
  const t = await getTranslations("profile");

  return (
    <AppShell>
      <div className="space-y-4 px-4 py-4">
        <ProfileHeader
          profile={profile}
          action={
            isSelf ? undefined : (
              <ProfileActions
                userId={profile.id}
                initialFollowing={initialFollowing}
                initialBlocked={initialBlocked}
              />
            )
          }
        />
        {listings.length > 0 ? (
          <ListingGrid listings={listings} />
        ) : (
          <EmptyState title={t("noListings")} />
        )}
        <ReviewsList reviews={reviews} />
      </div>
    </AppShell>
  );
}
