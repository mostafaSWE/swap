import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CheckCircle2, FileWarning, Lock, ScrollText, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { DocCard, LegalHero } from "@/components/legal";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("title"), description: t("subtitle") };
}

const DOC_ORDER = ["disclaimer", "privacy", "terms", "safety"] as const;
type DocKey = (typeof DOC_ORDER)[number];
const DOC_HREFS: Record<DocKey, string> = {
  disclaimer: "/disclaimer",
  privacy: "/privacy",
  terms: "/terms",
  safety: "/safety",
};
const DOC_ICONS: Record<DocKey, ReactNode> = {
  disclaimer: <FileWarning className="h-5 w-5" aria-hidden />,
  privacy: <Lock className="h-5 w-5" aria-hidden />,
  terms: <ScrollText className="h-5 w-5" aria-hidden />,
  safety: <ShieldCheck className="h-5 w-5" aria-hidden />,
};

export default async function LegalPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const principles = t.raw("principles") as string[];
  const docs = t.raw("docs") as Record<DocKey, { title: string; description: string }>;

  return (
    <AppShell>
      <LegalHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} updated={t("updated")} />

      <div className="mx-auto w-full max-w-[1120px] space-y-12 px-4 py-10 sm:px-6 md:py-12 lg:px-8">
        <section>
          <h2 className="text-xl font-bold tracking-tight text-ink md:text-2xl">{t("principlesTitle")}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {principles.map((p, i) => (
              <li key={i} className="flex items-start gap-3 rounded-card border border-line bg-surface p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <span className="text-sm leading-6 text-muted">{p}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold tracking-tight text-ink md:text-2xl">{t("docsTitle")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DOC_ORDER.map((key) => (
              <DocCard
                key={key}
                href={DOC_HREFS[key]}
                icon={DOC_ICONS[key]}
                title={docs[key].title}
                description={docs[key].description}
              />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
