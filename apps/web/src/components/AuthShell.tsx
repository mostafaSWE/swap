"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { RotatingSwap } from "./motion";

/**
 * Split-screen shell for the auth flows: a theme-aware brand panel on the lead
 * side (hidden on small screens) and the form on the trailing side. The form
 * column shows a compact logo on mobile, where the brand panel is collapsed.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("home");

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.04fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-night lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="bg-brand absolute inset-0 -z-10" />
        <div className="absolute inset-0 -z-10 opacity-[0.04] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="pointer-events-none absolute -bottom-20 -end-16 opacity-[0.06]">
          <RotatingSwap className="h-72 w-72 text-accent" strokeWidth={1.25} />
        </div>

        <Link href="/" aria-label="JustSwap home" className="relative w-fit">
          <Logo priority />
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-balance text-3xl font-bold leading-tight tracking-tight text-ink xl:text-4xl">
            {t("heroTitle")}
          </h2>
          <p className="mt-4 text-pretty leading-7 text-muted">{t("heroSubtitle")}</p>
          <ul className="mt-8 space-y-3 text-sm text-muted">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              {t("heroPreviewTrust")}
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              {t("heroPreviewSafety")}
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-muted">{t("heroBadge")}</p>
      </aside>

      {/* Form panel */}
      <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-canvas px-5 py-8 sm:px-6 sm:py-10 lg:justify-center lg:bg-surface">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(var(--accent)/0.12),transparent_34%),radial-gradient(circle_at_0%_85%,rgb(var(--accent)/0.10),transparent_32%),linear-gradient(180deg,rgb(var(--surface)/0.86),rgb(var(--canvas)))] lg:hidden"
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgb(var(--ink))_1px,transparent_1px),linear-gradient(90deg,rgb(var(--ink))_1px,transparent_1px)] [background-size:36px_36px] lg:hidden"
        />
        <div className="animate-auth-glow pointer-events-none absolute -top-24 h-72 w-72 rounded-full bg-accent/18 blur-3xl lg:hidden" />
        <div className="pointer-events-none absolute -bottom-24 -end-24 opacity-[0.08] lg:hidden">
          <RotatingSwap className="h-72 w-72 text-accent" strokeWidth={1.4} />
        </div>
        <MobileFloatingCard className="-start-7 top-24 -rotate-6 sm:start-8" />
        <MobileFloatingCard className="-end-8 bottom-28 rotate-6 sm:end-10" accent />

        <div className="relative my-auto w-full max-w-md lg:my-0">
          <div className="mb-6 flex justify-center lg:hidden">
            <Link
              href="/"
              aria-label="JustSwap home"
              className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <Logo priority />
            </Link>
          </div>
          <div className="animate-slide-up rounded-[24px] border border-line/80 bg-surface/82 p-5 shadow-elevated backdrop-blur-xl sm:p-7 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function MobileFloatingCard({ className, accent = false }: { className?: string; accent?: boolean }) {
  return (
    <div
      aria-hidden
      className={`animate-float-delayed pointer-events-none absolute hidden w-20 rounded-3xl border bg-surface/65 p-2.5 shadow-card backdrop-blur-md sm:block lg:hidden ${
        accent ? "border-accent/25" : "border-line/80"
      } ${className ?? ""}`}
    >
      <div className={`h-11 rounded-2xl ${accent ? "bg-accent/18" : "bg-gradient-to-br from-elevated to-line/60"}`} />
      <div className="mt-2 h-1.5 w-11 rounded-full bg-line" />
      <div className="mt-1.5 h-1.5 w-7 rounded-full bg-line/70" />
    </div>
  );
}
