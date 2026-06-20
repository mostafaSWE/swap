import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("disclaimerTitle") };
}

export default async function DisclaimerPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("legal");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-green-dark">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">{t("disclaimerTitle")}</h1>
        <p className="mt-4 text-base leading-8 text-muted">{t("disclaimerIntro")}</p>
        <div className="mt-8">
          <SafetyDisclaimer />
        </div>
      </div>
    </AppShell>
  );
}
