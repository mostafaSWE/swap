"use client";

import { ArrowRight, CheckCircle2, PackagePlus, Repeat2, Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { localizedName } from "@swap/ui";
import type { Locale, ListingWithRelations } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { ItemArtwork } from "./ItemArtwork";
import { SwapPair } from "./SwapPair";

export function Hero({
  sample,
  isAuthenticated,
}: {
  sample?: ListingWithRelations;
  isAuthenticated: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const addHref = isAuthenticated ? "/new-listing" : "/login";

  return (
    <section className="relative isolate overflow-hidden bg-white">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(24,182,106,0.16),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f5f7f8_100%)]" />
      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-10 px-4 py-10 sm:px-6 md:py-14 lg:grid-cols-[1fr_0.92fr] lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-pill border border-green/20 bg-green-light px-3 py-1.5 text-xs font-bold text-green-dark">
            <Repeat2 className="h-4 w-4" aria-hidden />
            {t("home.heroBadge")}
          </span>
          <h1 className="mt-5 max-w-4xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-navy md:text-5xl lg:text-6xl">
            {t("home.heroTitle")}
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-8 text-ink/70 md:text-lg">
            {t("home.heroSubtitle")}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href={addHref} className="btn-primary min-h-12 px-6 text-base">
              <PackagePlus className="h-5 w-5" aria-hidden />
              {t("home.cta")}
            </Link>
            <Link href="/categories" className="btn-secondary min-h-12 px-6 text-base">
              {t("home.browseCategories")}
              <ArrowRight className="rtl-flip h-5 w-5" aria-hidden />
            </Link>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">{t("home.heroTrustNote")}</p>
        </div>

        <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
          <div className="absolute -end-4 -top-4 h-28 w-28 rounded-full bg-green/15 blur-2xl" />
          <div className="absolute -bottom-8 start-10 h-32 w-32 rounded-full bg-navy/10 blur-2xl" />
          {sample ? (
            <div className="relative rounded-[28px] border border-white/80 bg-white/80 p-3 shadow-elevated backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-[1fr_0.9fr]">
                <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                  <div className="relative aspect-[4/3]">
                    <ItemArtwork
                      listing={sample}
                      className="h-full w-full"
                      sizes="(max-width: 1024px) 90vw, 420px"
                      priority
                    />
                    <span className="absolute start-3 top-3 rounded-pill bg-white/95 px-3 py-1 text-xs font-bold text-navy shadow-sm">
                      {t("home.realListing")}
                    </span>
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <h2 className="line-clamp-2 text-lg font-extrabold leading-6 text-ink">{sample.title}</h2>
                      <p className="mt-1 text-sm text-muted">{localizedName(sample.city, locale)}</p>
                    </div>
                    <div className="rounded-2xl bg-canvas p-3">
                      <SwapPair listing={sample} size="md" />
                    </div>
                  </div>
                </article>

                <div className="flex flex-col justify-between gap-3 rounded-2xl bg-navy p-5 text-white">
                  <div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-green-light">
                      <Repeat2 className="h-5 w-5" aria-hidden />
                    </span>
                    <p className="mt-4 text-sm font-bold text-green-light">{t("home.heroPreviewLabel")}</p>
                    <p className="mt-2 text-pretty text-2xl font-extrabold leading-tight">{sample.wanted_exchange}</p>
                  </div>
                  <div className="space-y-3 border-t border-white/15 pt-4 text-sm text-white/75">
                    <p className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-light" aria-hidden />
                      {t("home.heroPreviewTrust")}
                    </p>
                    <p className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-light" aria-hidden />
                      {t("home.heroPreviewSafety")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyHeroVisual />
          )}
        </div>
      </div>
    </section>
  );
}

function EmptyHeroVisual() {
  const t = useTranslations("home");

  return (
    <div className="relative rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-elevated backdrop-blur">
      <div className="grid gap-3 sm:grid-cols-3">
        <FlowCard icon={<PackagePlus className="h-6 w-6" aria-hidden />} title={t("how.step1Title")} text={t("how.step1Body")} />
        <FlowCard icon={<Search className="h-6 w-6" aria-hidden />} title={t("how.step2Title")} text={t("how.step2Body")} />
        <FlowCard icon={<Repeat2 className="h-6 w-6" aria-hidden />} title={t("how.step3Title")} text={t("how.step3Body")} accent />
      </div>
    </div>
  );
}

function FlowCard({
  icon,
  title,
  text,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <div className={accent ? "rounded-2xl bg-navy p-5 text-white" : "rounded-2xl border border-line bg-white p-5"}>
      <span
        className={
          accent
            ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-green-light"
            : "flex h-12 w-12 items-center justify-center rounded-2xl bg-green-light text-green-dark"
        }
      >
        {icon}
      </span>
      <h2 className={accent ? "mt-5 text-base font-extrabold text-white" : "mt-5 text-base font-extrabold text-ink"}>{title}</h2>
      <p className={accent ? "mt-2 text-sm leading-6 text-white/70" : "mt-2 text-sm leading-6 text-muted"}>{text}</p>
    </div>
  );
}
