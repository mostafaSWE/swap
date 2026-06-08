/**
 * Platform-agnostic presentation helpers shared by web and mobile.
 * Pure functions only — no React, no DOM, no React Native imports — so both
 * apps can import them safely.
 */
import type { Locale } from "@swap/types";

/** An object that carries both Arabic and English names (country, city, category…). */
export interface Localized {
  name_ar: string;
  name_en: string;
}

/** Pick the right localized name for the active locale. */
export function localizedName(item: Localized, locale: Locale): string {
  return locale === "ar" ? item.name_ar : item.name_en;
}

/** Locale-aware number formatting (e.g. Arabic-Indic digits for `ar`). */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(value);
}

/** Locale-aware date formatting. */
export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/** Compact relative time ("3h", "2d"). Locale chooses the unit labels. */
export function formatRelativeTime(iso: string, locale: Locale, now = Date.now()): string {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", {
    numeric: "auto",
    style: "short",
  });
  const ranges: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  for (const [unit, seconds] of ranges) {
    if (Math.abs(diffSec) >= seconds) {
      return rtf.format(Math.round(diffSec / seconds), unit);
    }
  }
  return rtf.format(diffSec, "second");
}
