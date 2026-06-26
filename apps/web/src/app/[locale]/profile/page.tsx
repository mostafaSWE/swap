import { Pencil, Settings, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale, PublicProfile } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ListingGrid } from "@/components/ListingGrid";
import { ReviewsList } from "@/components/ReviewsList";
import { EmptyState } from "@/components/primitives";
import { CTAButton } from "@/components/CTAButton";
import { LogoutButton } from "@/components/LogoutButton";
import { Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { fetchUserListings, fetchUserReviews } from "@/lib/data";

export default async function ProfilePage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("profile");
  const tn = await getTranslations("nav");
  const ta = await getTranslations("auth");

  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <AppShell>
        <EmptyState
          title={ta("loginTitle")}
          description={ta("noAccount")}
          action={<CTAButton href="/login">{tn("login")}</CTAButton>}
        />
      </AppShell>
    );
  }

  const [listings, reviews] = await Promise.all([
    fetchUserListings(profile.id),
    fetchUserReviews(profile.id),
  ]);
  const publicProfile = profile as unknown as PublicProfile;

  return (
    <AppShell>
      <div className="px-4 py-4 md:grid md:grid-cols-3 md:gap-6 md:py-6">
        <div className="space-y-4 md:col-span-1 md:sticky md:top-20 md:self-start">
          <ProfileHeader
            profile={publicProfile}
            action={
              <div className="grid grid-cols-2 gap-2">
                <Link href="/profile/edit" className="btn-secondary">
                  <Pencil className="h-4 w-4" aria-hidden />
                  {t("edit")}
                </Link>
                <Link href="/settings" className="btn-secondary">
                  <Settings className="h-4 w-4" aria-hidden />
                  {tn("settings")}
                </Link>
              </div>
            }
          />

          {profile.is_admin ? (
            <Link href="/admin" className="card flex items-center gap-2 p-3 text-ink">
              <ShieldCheck className="h-5 w-5 text-green" aria-hidden />
              <span className="font-semibold">{tn("admin")}</span>
            </Link>
          ) : null}

          <LogoutButton />
        </div>

        <div className="mt-4 space-y-4 md:col-span-2 md:mt-0">
          <h2 className="font-bold text-ink">{t("listings")}</h2>
          {listings.length > 0 ? (
            <ListingGrid listings={listings} />
          ) : (
            <EmptyState title={t("noListings")} action={<CTAButton href="/new-listing">{tn("addListing")}</CTAButton>} />
          )}
          <ReviewsList reviews={reviews} />
        </div>
      </div>
    </AppShell>
  );
}
