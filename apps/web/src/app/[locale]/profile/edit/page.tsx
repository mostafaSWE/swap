import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/primitives";
import { CTAButton } from "@/components/CTAButton";
import { getCurrentProfile } from "@/lib/auth";
import { EditProfileForm } from "./EditProfileForm";

export default async function EditProfilePage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("profile");
  const tn = await getTranslations("nav");
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <AppShell hideNav>
        <EmptyState title={tn("login")} action={<CTAButton href="/login">{tn("login")}</CTAButton>} />
      </AppShell>
    );
  }

  return (
    <AppShell hideNav>
      <div className="px-4 py-4">
        <h1 className="mb-4 text-xl font-bold text-ink">{t("edit")}</h1>
        <EditProfileForm profile={profile} />
      </div>
    </AppShell>
  );
}
