import type { Locale } from "../i18n";

const MONTHS: Record<Locale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};

/** "Jan 2024" / "يناير 2024" — Intl-free (Hermes `Intl.DateTimeFormat` is
 *  unreliable on-device, same reason we dropped `Intl` for locale detection). */
export function monthYear(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[locale][d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Day-precision date — the mobile counterpart of web's `formatDate` (@swap/ui),
 * which is `Intl.DateTimeFormat(locale, {year:"numeric",month:"short",day:"numeric"})`.
 *
 * Reimplemented Intl-free for the same reason as `monthYear` above: Hermes'
 * `Intl.DateTimeFormat` is unreliable on-device. Digits stay Latin in both locales,
 * matching `monthYear` (and therefore "member since" on profiles) rather than web's
 * Arabic-Indic output — an intentional, consistent deviation inside the app.
 *
 *   en → "Jan 5, 2026"      ar → "5 يناير 2026"
 */
export function fullDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const month = MONTHS[locale][d.getMonth()];
  return locale === "ar"
    ? `${d.getDate()} ${month} ${d.getFullYear()}`
    : `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Compact relative time for chat/lists ("now", "5m", "2h", "3d", else the month).
 *  Intl-free. */
export function timeAgo(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, (Date.now() - then) / 1000);
  if (s < 60) return locale === "ar" ? "الآن" : "now";
  const m = Math.floor(s / 60);
  if (m < 60) return locale === "ar" ? `${m} د` : `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return locale === "ar" ? `${h} س` : `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return locale === "ar" ? `${d} ي` : `${d}d`;
  return monthYear(iso, locale);
}
