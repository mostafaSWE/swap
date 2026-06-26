import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { LegalArticle, LegalHero, type LegalSection } from "@/components/legal";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function PrivacyPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  const tc = await getTranslations("legalCommon");

  return (
    <AppShell>
      <LegalHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} updated={t("updated")} />
      <LegalArticle
        sections={t.raw("sections") as LegalSection[]}
        onThisPage={tc("onThisPage")}
        help={{ title: tc("helpTitle"), body: tc("helpBody"), cta: tc("helpCta") }}
      />
    </AppShell>
  );
}
