import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { LegalArticle, LegalHero, type LegalSection } from "@/components/legal";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "safety" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function SafetyPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("safety");
  const tc = await getTranslations("legalCommon");

  return (
    <AppShell>
      <LegalHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} updated={t("updated")} />
      <LegalArticle
        sections={t.raw("sections") as LegalSection[]}
        onThisPage={tc("onThisPage")}
        help={{ title: tc("helpTitle"), body: tc("helpBody"), cta: tc("helpCta") }}
        extra={
          <div>
            <h2 className="text-xl font-bold tracking-tight text-ink md:text-2xl">{t("noticeTitle")}</h2>
            <div className="mt-3">
              <SafetyDisclaimer />
            </div>
          </div>
        }
      />
    </AppShell>
  );
}
