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

export async function generateMetadata({
  params: { username },
}: {
  params: { locale: Locale; username: string };
}): Promise<Metadata> {
  const profile = await fetchPublicProfile(username);
  if (!profile) return {};
  const name = profile.full_name || `@${profile.username}`;
  const description = (profile.bio ?? "").slice(0, 160) || undefined;
  const images = profile.avatar_url ? [profile.avatar_url] : undefined;
  return {
    title: name,
    description,
    openGraph: { title: name, description, images, type: "profile" },
    twitter: { card: "summary", title: name, description, images },
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
