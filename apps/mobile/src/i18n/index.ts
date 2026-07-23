import { getLocales } from "expo-localization";
import arBase from "./ar.json";
import enBase from "./en.json";

// Expo inlines EXPO_PUBLIC_* at build time; declare process for typing only.
declare const process: { env: Record<string, string | undefined> };

export type Locale = "ar" | "en";

/**
 * App locale — the device locale via **expo-localization** (`getLocales()`), the
 * correct, reliable cross-Android-version API (Hermes `Intl` device-locale is
 * unreliable). An optional EXPO_PUBLIC_LOCALE override forces ar/en for testing.
 *
 * **Locale rule (D-7):** an **Arabic** device → **Arabic**; **any other** device
 * language → **English**. (English is the universal fallback; only an explicitly
 * Arabic device gets Arabic.)
 */
function detectLocale(): Locale {
  const override = process.env.EXPO_PUBLIC_LOCALE;
  if (override === "ar" || override === "en") return override;
  return getLocales()[0]?.languageCode?.toLowerCase() === "ar" ? "ar" : "en";
}

export const locale: Locale = detectLocale();

/**
 * The **required** layout direction for the active locale — the hard invariant:
 * **Arabic ⇒ RTL, English ⇒ LTR**, always. This module never mutates
 * `I18nManager`; the native flag is reconciled to this value exactly once, by the
 * **boot direction guard** in `app/_layout.tsx`, which reloads behind the splash
 * if the native flag disagrees so a mismatched direction is never rendered.
 */
export const isRTL = locale === "ar";

// Mobile-only strings. The shared web catalog is ported verbatim in
// ar.json / en.json; these are labels unique to the native app shell.
const mobile = {
  ar: {
    tab: { home: "الرئيسية", browse: "تصفّح", messages: "المحادثات", notifications: "الإشعارات", profile: "حسابي" },
    home: { categories: "التصنيفات", featured: "إعلانات مميّزة", empty: "لا توجد إعلانات بعد" },
    browse: { search: "ابحث عن غرض…", all: "الكل", newest: "الأحدث", mostViewed: "الأكثر مشاهدة", empty: "لا توجد إعلانات تطابق بحثك" },
    detail: { save: "حفظ", saved: "محفوظ", views: "{count} مشاهدة", notFound: "لم يُعثر على الإعلان", conditions: { new: "جديد", used: "مستعمل" } },
    soon: {
      title: "قريبًا",
      browse: "التصفّح والبحث — المرحلة M2",
      messages: "المحادثات في الوقت الفعلي — المرحلة M3",
      notifications: "مركز الإشعارات — المرحلة M3",
      profile: "الملف الشخصي والإعدادات — المرحلة M3",
    },
  },
  en: {
    tab: { home: "Home", browse: "Browse", messages: "Messages", notifications: "Alerts", profile: "Profile" },
    home: { categories: "Categories", featured: "Featured listings", empty: "No listings yet" },
    browse: { search: "Search for an item…", all: "All", newest: "Newest", mostViewed: "Most viewed", empty: "No listings match your search" },
    detail: { save: "Save", saved: "Saved", views: "{count} views", notFound: "Listing not found", conditions: { new: "New", used: "Used" } },
    soon: {
      title: "Coming soon",
      browse: "Browse & search — Phase M2",
      messages: "Realtime messaging — Phase M3",
      notifications: "Notification center — Phase M3",
      profile: "Profile & settings — Phase M3",
    },
  },
} as const;

const catalog: Record<Locale, Record<string, unknown>> = {
  ar: { ...(arBase as Record<string, unknown>), mobile: mobile.ar },
  en: { ...(enBase as Record<string, unknown>), mobile: mobile.en },
};

function lookup(root: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), root);
}

/**
 * Translate a dotted key ("nav.home", "mobile.tab.browse", "listing.postedIn").
 * Falls back to English, then to the raw key. Supports simple `{param}`
 * interpolation; ICU plural forms render literally (not needed yet).
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = lookup(catalog[locale], key) ?? lookup(catalog.en, key) ?? key;
  if (typeof raw !== "string") return key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_m, k: string) => (params[k] != null ? String(params[k]) : `{${k}}`));
}
