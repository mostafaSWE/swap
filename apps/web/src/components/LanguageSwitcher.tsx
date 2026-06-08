"use client";

import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@swap/types";

/** Toggles between Arabic and English while keeping the current path. */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = locale === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: switchTo })}
      className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink"
      aria-label="Switch language"
    >
      <Languages className="h-4 w-4" aria-hidden />
      {switchTo === "ar" ? "العربية" : "EN"}
    </button>
  );
}
