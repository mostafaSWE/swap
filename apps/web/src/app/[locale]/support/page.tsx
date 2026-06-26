import type { Metadata } from "next";
import { Flag, Mail } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { LegalHero } from "@/components/legal";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "support" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function SupportPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("support");
  const tf = await getTranslations("footer");
  const topics = t.raw("topics") as { title: string; description: string }[];
  const email = t("email");

  const selfServe = [
    { href: "/safety", label: tf("safety") },
    { href: "/terms", label: tf("terms") },
    { href: "/privacy", label: tf("privacy") },
  ];

  return (
    <AppShell>
      <LegalHero eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />

      <div className="mx-auto w-full max-w-[1120px] space-y-12 px-4 py-10 sm:px-6 md:py-12 lg:px-8">
        {/* Email — the primary channel */}
        <section className="overflow-hidden rounded-card border border-accent/20 bg-accent-soft p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Mail className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-bold text-ink">{t("emailTitle")}</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted">{t("emailNote")}</p>
                <a href={`mailto:${email}`} className="mt-2 inline-block text-sm font-bold text-accent hover:underline">
                  {email}
                </a>
              </div>
            </div>
            <a href={`mailto:${email}`} className="btn-primary shrink-0 !px-5 !py-2.5 text-sm">
              <Mail className="h-4 w-4" aria-hidden />
              {t("emailCta")}
            </a>
          </div>
        </section>

        {/* What we can help with */}
        <section>
          <h2 className="text-xl font-bold tracking-tight text-ink md:text-2xl">{t("topicsTitle")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((tp, i) => (
              <div key={i} className="rounded-card border border-line bg-surface p-5 shadow-card">
                <h3 className="text-base font-bold text-ink">{tp.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted">{tp.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Report + self-serve */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              <Flag className="h-4 w-4 text-accent" aria-hidden />
              {t("reportTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">{t("reportNote")}</p>
          </div>
          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="text-base font-bold text-ink">{t("selfServeTitle")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{t("selfServeNote")}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {selfServe.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="chip transition-colors hover:border-accent/40 hover:text-accent">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
