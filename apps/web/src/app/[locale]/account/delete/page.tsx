import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { LegalArticle, LegalHero, type LegalSection } from "@/components/legal";
import { getCurrentUser } from "@/lib/auth";
import { altLinks } from "@/lib/seo";
import { DeleteAccountPanel } from "./DeleteAccountPanel";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "deleteAccount" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: altLinks(locale, "/account/delete"),
    // Google Play requires this route to be publicly discoverable, so it must stay indexable.
    robots: { index: true, follow: true },
  };
}

/**
 * Public account-deletion route (Google Play User Data policy / Apple 5.1.1(v)).
 *
 * Reachable WITHOUT the app and WITHOUT signing in — that is the whole point of the
 * page. The session only decides which panel is shown: signed-in users delete
 * immediately, everyone else files a request we action within 30 days.
 */
export default async function DeleteAccountPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("deleteAccount");
  const tc = await getTranslations("legalCommon");
  const user = await getCurrentUser();

  return (
    <AppShell>
      <LegalHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} updated={t("updated")} />

      <div className="mx-auto w-full max-w-[1120px] px-4 pt-10 sm:px-6 md:pt-12 lg:px-8">
        <DeleteAccountPanel isAuthenticated={Boolean(user)} email={user?.email ?? null} />
      </div>

      <LegalArticle
        sections={t.raw("sections") as LegalSection[]}
        onThisPage={tc("onThisPage")}
        help={{ title: tc("helpTitle"), body: tc("helpBody"), cta: tc("helpCta") }}
      />
    </AppShell>
  );
}
