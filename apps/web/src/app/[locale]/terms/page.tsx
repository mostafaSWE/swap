import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";

export default async function TermsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("terms");

  return (
    <AppShell>
      <div className="space-y-4 px-4 py-4">
        <h1 className="text-xl font-bold text-ink">{t("title")}</h1>
        {/* TODO: replace with finalized legal copy. */}
        <p className="text-sm text-muted">{t("placeholder")}</p>
      </div>
    </AppShell>
  );
}
