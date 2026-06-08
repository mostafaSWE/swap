import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ListingGrid } from "@/components/ListingGrid";
import { EmptyState } from "@/components/primitives";
import { ReportDialog } from "@/components/ReportDialog";
import { fetchPublicProfile, fetchUserListings } from "@/lib/data";

export default async function PublicProfilePage({
  params: { locale, username },
}: {
  params: { locale: Locale; username: string };
}) {
  setRequestLocale(locale);
  const profile = await fetchPublicProfile(username);
  if (!profile) notFound();

  const listings = await fetchUserListings(profile.id);
  const t = await getTranslations("profile");

  return (
    <AppShell>
      <div className="space-y-4 px-4 py-4">
        <ProfileHeader
          profile={profile}
          action={
            <div className="flex justify-center">
              <ReportDialog targetType="user" targetId={profile.id} />
            </div>
          }
        />
        {listings.length > 0 ? (
          <ListingGrid listings={listings} />
        ) : (
          <EmptyState title={t("noListings")} />
        )}
      </div>
    </AppShell>
  );
}
