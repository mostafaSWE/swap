"use client";

import { ArrowRight, Plus, Repeat2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ListingWithRelations } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { SwapPair } from "./SwapPair";
import { VerifiedBadge } from "./badges";

/**
 * Home hero — navy surface stating the barter promise, stats, and a live example
 * SwapPair. `sample` is any featured listing used for the example card (optional).
 */
export function Hero({ sample }: { sample?: ListingWithRelations }) {
  const t = useTranslations();
  const stats: Array<[string, string]> = [
    [t("home.stats.itemsValue"), t("home.stats.itemsLabel")],
    [t("home.stats.countriesValue"), t("home.stats.countriesLabel")],
    [t("home.stats.swapsValue"), t("home.stats.swapsLabel")],
  ];

  return (
    <section className="relative overflow-hidden bg-navy text-white">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "repeating-linear-gradient(45deg,#fff 0 1px,transparent 1px 16px)" }}
      />
      <div className="absolute -end-10 -top-10 h-44 w-44 rounded-full bg-green/20 blur-2xl" />
      <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12 lg:flex lg:items-center lg:gap-10">
        <div className="lg:flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-3 py-1 text-xs font-semibold text-green-light ring-1 ring-white/15">
            <Repeat2 className="h-3.5 w-3.5" aria-hidden />
            {t("home.heroBadge")}
          </span>
          <h1 className="mt-4 text-balance text-[28px] font-extrabold leading-[1.15] tracking-tight md:text-4xl">
            {t("home.heroTitle")}
          </h1>
          <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-white/70 md:text-base">
            {t("home.heroSubtitle")}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link href="/new-listing" className="btn-primary !px-5 text-sm shadow-elevated">
              <Plus className="h-[17px] w-[17px]" aria-hidden strokeWidth={2.4} />
              {t("home.cta")}
            </Link>
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 rounded-pill border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {t("nav.categories")}
              <ArrowRight className="rtl-flip h-4 w-4" aria-hidden />
            </Link>
          </div>
          <dl className="mt-7 flex gap-6">
            {stats.map(([num, label]) => (
              <div key={label}>
                <dt className="text-xl font-extrabold text-green-light md:text-2xl">{num}</dt>
                <dd className="text-[11px] text-white/60">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {sample ? (
          <div className="mt-7 lg:mt-0 lg:w-[340px]">
            <div className="rounded-2xl bg-white p-4 shadow-elevated">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-muted">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-light text-green-dark">
                  <Repeat2 className="h-3.5 w-3.5" aria-hidden />
                </span>
                {t("home.exampleSwap")}
              </div>
              <SwapPair listing={sample} size="lg" />
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-ink">
                <span className="truncate">{sample.owner?.full_name}</span>
                {sample.owner?.is_verified ? <VerifiedBadge label={t("listing.verifiedAccount")} /> : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
