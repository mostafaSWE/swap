import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { confirmed?: string };
}) {
  setRequestLocale(locale);
  const profile = await getCurrentProfile();
  if (!profile) redirect({ href: "/login", locale });

  return (
    <AppShell hideNav>
      <OnboardingForm profile={profile!} confirmed={searchParams.confirmed} />
    </AppShell>
  );
}
