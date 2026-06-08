import { Pencil, Settings, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale, PublicProfile } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { ProfileHeader } from "@/components/ProfileHeader";
import { ListingGrid } from "@/components/ListingGrid";
import { EmptyState } from "@/components/primitives";
import { CTAButton } from "@/components/CTAButton";
import { LogoutButton } from "@/components/LogoutButton";
import { Link } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { fetchUserListings } from "@/lib/data";

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

  const listings = await fetchUserListings(profile.id);
  const publicProfile = profile as unknown as PublicProfile;

  return (
    <AppShell>
      <div className="space-y-4 px-4 py-4">
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
          <Link href="/admin" className="card flex items-center gap-2 p-3 text-navy">
            <ShieldCheck className="h-5 w-5 text-green" aria-hidden />
            <span className="font-semibold">{tn("admin")}</span>
          </Link>
        ) : null}

        <h2 className="font-bold text-ink">{t("listings")}</h2>
        {listings.length > 0 ? (
          <ListingGrid listings={listings} />
        ) : (
          <EmptyState title={t("noListings")} action={<CTAButton href="/new-listing">{tn("addListing")}</CTAButton>} />
        )}

        <LogoutButton />
      </div>
    </AppShell>
  );
}
