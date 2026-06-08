import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

export default async function SafetyPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("safety");

  return (
    <AppShell>
      <div className="space-y-4 px-4 py-4">
        <h1 className="text-xl font-bold text-ink">{t("title")}</h1>
        <SafetyDisclaimer />
      </div>
    </AppShell>
  );
}
