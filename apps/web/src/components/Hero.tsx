"use client";

import Image from "next/image";
import { ArrowRight, PackagePlus, Repeat2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Reveal, Stagger, StaggerItem } from "./motion";

/**
 * Feathers all four edges of the hero visual to transparent so its rectangular
 * backdrop melts into the page (and the motif behind it) instead of reading as a
 * pasted-in card. Two linear masks intersected = a soft, rounded-feeling edge.
 */
const FEATHER =
  "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent), linear-gradient(to bottom, transparent, #000 8%, #000 92%, transparent)";
const softEdge: React.CSSProperties = {
  WebkitMaskImage: FEATHER,
  maskImage: FEATHER,
  WebkitMaskComposite: "source-in",
  maskComposite: "intersect",
};

export function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const isArabic = locale === "ar";
  const addHref = isAuthenticated ? "/new-listing" : "/login";

  return (
    <section className="relative isolate overflow-hidden bg-canvas">
      {/* Branded background image — theme-swapped, full-bleed. Decorative.
          The source has the swap motif on the start side; mirror it on the
          vertical axis in RTL only, so EN and AR are mirror images of each other. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[url('/images/landing/hero-bg-light-cropped.webp')] bg-cover bg-center rtl:[transform:scaleX(-1)] dark:bg-[url('/images/landing/hero-bg-dark-cropped.webp')] md:bg-[url('/images/landing/hero-bg-light.webp')] md:dark:bg-[url('/images/landing/hero-bg-dark.webp')]"
      />

      {/* Contrast scrim: keeps the text side readable over the image while leaving
          the visual side vivid. Vertical on mobile (text on top), inline-start on
          desktop (RTL-aware). Canvas-coloured, so it follows the theme. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-canvas/55 via-canvas/20 to-transparent dark:from-canvas dark:via-canvas/70 lg:via-canvas/35 lg:dark:via-canvas/45 lg:ltr:bg-gradient-to-r lg:rtl:bg-gradient-to-l"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_58%,rgb(var(--accent)/0.10),transparent_48%)] dark:hidden"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-28 translate-y-px bg-gradient-to-b from-canvas/0 via-canvas/55 to-canvas dark:via-canvas/85 sm:h-36 md:h-44 lg:h-56"
      />

      <div className="relative mx-auto grid w-full max-w-[1440px] items-start px-4 pb-5 pt-7 sm:px-6 sm:pb-9 sm:pt-10 md:min-h-[620px] md:grid-cols-[1fr_0.9fr] md:items-center md:gap-8 md:overflow-visible md:py-16 lg:min-h-[680px] lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-24">
        <Stagger className="relative z-10 mx-auto max-w-[25rem] text-center md:mx-0 md:max-w-2xl md:text-start" gap={0.1}>
          <StaggerItem>
            <span className="inline-flex items-center gap-2 rounded-pill border border-accent/25 bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent backdrop-blur-sm">
              <Repeat2 className="h-4 w-4" aria-hidden />
              {t("home.heroBadge")}
            </span>
          </StaggerItem>
          <StaggerItem>
            <h1
              className={cn(
                "mx-auto mt-4 font-bold leading-[1.08] tracking-normal text-ink md:mx-0 md:max-w-4xl md:text-5xl md:leading-[1.04] lg:text-6xl",
                isArabic
                  ? "max-w-[calc(100vw-2rem)] whitespace-nowrap text-[clamp(1.75rem,7.55vw,2.3rem)] sm:text-5xl"
                  : "max-w-[12ch] text-balance text-[2.35rem] min-[390px]:text-[2.55rem] sm:max-w-[13ch] sm:text-5xl",
              )}
            >
              {t("home.heroTitle")}
            </h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mx-auto mt-3 max-w-[34rem] text-pretty text-sm leading-7 text-muted sm:text-base md:mx-0 md:mt-5 md:text-lg md:leading-8">
              {t("home.heroSubtitle")}
            </p>
          </StaggerItem>
          <StaggerItem>
            <div className="mx-auto mt-5 grid max-w-sm gap-2.5 sm:max-w-none sm:grid-cols-2 sm:gap-3 md:mx-0 md:mt-7 md:flex md:flex-row md:gap-3">
              <Link href={addHref} className="btn-primary min-h-12 px-6 text-base shadow-glow">
                <PackagePlus className="h-5 w-5" aria-hidden />
                {t("home.cta")}
              </Link>
              <Link href="/categories" className="btn-secondary min-h-12 border-white/10 bg-surface/80 px-6 text-base backdrop-blur-md md:bg-elevated">
                {t("home.browseCategories")}
                <ArrowRight className="rtl-flip h-5 w-5" aria-hidden />
              </Link>
            </div>
          </StaggerItem>
          <StaggerItem>
            <p className="mx-auto mt-3 max-w-[32rem] text-xs leading-6 text-muted sm:text-sm md:mx-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
              {t("home.heroTrustNote")}
            </p>
          </StaggerItem>
        </Stagger>

        {/* Hero visual — theme-swapped product-swap illustration. Its own backdrop
            matches the theme canvas, so it blends into the section (no hard frame);
            a soft accent glow gives depth without looking pasted on. */}
        <Reveal
          delay={0.15}
          y={24}
          className="pointer-events-none relative z-0 mx-auto hidden md:flex md:pointer-events-auto md:h-auto md:w-auto md:max-w-none md:items-center md:justify-center"
        >
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" />
          <Image
            src="/images/landing/hero-visual-light.webp"
            alt={t("home.heroVisualAlt")}
            width={1448}
            height={1086}
            unoptimized
            sizes="(max-width: 1024px) 46vw, 600px"
            style={softEdge}
            className="animate-float h-auto w-full max-w-[600px] object-contain dark:hidden"
          />
          <Image
            src="/images/landing/hero-visual-dark.webp"
            alt={t("home.heroVisualAlt")}
            width={1448}
            height={1086}
            unoptimized
            sizes="(max-width: 1024px) 46vw, 600px"
            style={softEdge}
            className="animate-float hidden h-auto w-full max-w-[600px] object-contain dark:block"
          />
        </Reveal>
      </div>
    </section>
  );
}
