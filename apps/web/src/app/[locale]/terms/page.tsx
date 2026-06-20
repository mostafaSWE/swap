import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";

export default async function TermsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("terms");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-green-dark">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">{t("title")}</h1>
        <div className="mt-6 space-y-5 text-base leading-8 text-muted">
          <p>{t("intro")}</p>
          <p>{t("marketplace")}</p>
          <p>{t("conduct")}</p>
          <p>{t("handover")}</p>
        </div>
      </div>
    </AppShell>
  );
}
