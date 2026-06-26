"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@swap/types";
import { cn } from "@/lib/utils";

/** Toggles between Arabic and English while keeping the current path. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = locale === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: switchTo })}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-pill border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className,
      )}
      aria-label="Switch language"
    >
      <Languages className="h-4 w-4" aria-hidden />
      {switchTo === "ar" ? "AR" : "EN"}
    </button>
  );
}
