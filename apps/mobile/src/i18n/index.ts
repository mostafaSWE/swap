import { getLocales } from "expo-localization";
import { DevSettings, I18nManager } from "react-native";
import arBase from "./ar.json";
import enBase from "./en.json";

// Expo inlines EXPO_PUBLIC_* at build time; declare process for typing only.
declare const process: { env: Record<string, string | undefined> };

export type Locale = "ar" | "en";

/**
 * App locale — the device locale via **expo-localization** (`getLocales()`), the
 * correct, reliable cross-Android-version API (Hermes `Intl` device-locale is
 * unreliable). An optional EXPO_PUBLIC_LOCALE override forces ar/en for testing.
 * **Arabic-first:** any device locale that is neither `ar` nor `en` falls back
 * to **ar** (matches the web default).
 */
function detectLocale(): Locale {
  const override = process.env.EXPO_PUBLIC_LOCALE;
  if (override === "ar" || override === "en") return override;
  const code = getLocales()[0]?.languageCode?.toLowerCase();
  if (code === "ar") return "ar";
  if (code === "en") return "en";
  return "ar";
}

export const locale: Locale = detectLocale();
export const isRTL = locale === "ar";

// Arabic-first: force the native layout direction to match the app locale, so an
// Arabic UI is RTL even on an LTR device (the `ar` fallback case) and vice-versa.
// The native flag is read when the root view is created, so a *flip* only applies
// after a full app relaunch. We set the flag here; production wires
// expo-updates `Updates.reloadAsync()` (added with the in-app language switcher)
// to relaunch automatically. A JS-only reload does NOT flip the native axis, so
// we don't auto-reload here (avoids a reload loop) — a manual relaunch applies it.
I18nManager.allowRTL(true);
if (I18nManager.isRTL !== isRTL) {
  I18nManager.forceRTL(isRTL);
  if (__DEV__) {
    console.log(`[i18n] forced RTL=${isRTL} for locale="${locale}" — relaunch the app to apply it.`);
    void DevSettings; // reserved for the dev reload hook once RTL-flip UX is wired
  }
}

// Mobile-only strings. The shared web catalog is ported verbatim in
// ar.json / en.json; these are labels unique to the native app shell.
const mobile = {
  ar: {
    tab: { home: "الرئيسية", browse: "تصفّح", messages: "المحادثات", notifications: "الإشعارات", profile: "حسابي" },
    home: { categories: "التصنيفات", featured: "إعلانات مميّزة", empty: "لا توجد إعلانات بعد" },
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
