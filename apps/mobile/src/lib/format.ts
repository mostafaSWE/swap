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
