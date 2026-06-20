import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

export default async function SafetyPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("safety");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">{t("title")}</h1>
        <SafetyDisclaimer />
      </div>
    </AppShell>
  );
}
