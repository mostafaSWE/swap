import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("title") };
}

export default async function PrivacyPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-wide text-green-dark">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">{t("title")}</h1>
        <div className="mt-6 space-y-5 text-base leading-8 text-muted">
          <p>{t("intro")}</p>
          <p>{t("data")}</p>
          <p>{t("contact")}</p>
        </div>
      </div>
    </AppShell>
  );
}
