import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { LegalArticle, LegalHero, type LegalSection } from "@/components/legal";
import { altLinks } from "@/lib/seo";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "childSafety" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: altLinks(locale, "/child-safety"),
    robots: { index: true, follow: true },
  };
}

/**
 * Published CSAE (child sexual abuse and exploitation) standards — required by
 * Google Play's Child Safety Standards policy for social / user-generated-content
 * apps, and linked from the store listing. Public and indexable.
 */
export default async function ChildSafetyPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("childSafety");
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
