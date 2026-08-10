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

// `locale`/`isRTL` are live `let` bindings, not `const`: the boot guard may
// reassign them from a persisted in-app language override BEFORE the first screen
// renders (see `applyLocaleOverride`). Every read across the app is a render-time
// read of the live binding — no module-level code captures the boot value — so a
// reassignment propagates everywhere. Screens never mutate these directly.
export let locale: Locale = detectLocale();

/**
 * The **required** layout direction for the active locale — the hard invariant:
 * **Arabic ⇒ RTL, English ⇒ LTR**, always. This module never mutates
 * `I18nManager`; the native flag is reconciled to this value exactly once, by the
 * **boot direction guard** in `app/_layout.tsx`, which reloads behind the splash
 * if the native flag disagrees so a mismatched direction is never rendered.
 */
export let isRTL = locale === "ar";

/**
 * Apply a persisted in-app language choice at boot — called ONLY by the boot
 * direction guard in `app/_layout.tsx`, before anything renders. Reassigns the
 * live `locale`/`isRTL` bindings so `t()`/`tList()` and every render-time `locale`
 * read resolve to the chosen language. Layout direction is reconciled separately
 * by that same guard (`I18nManager.forceRTL` + reload); this function never
 * touches `I18nManager`. Never call this from a screen — direction cannot change
 * without a reload, so runtime mutation would desync text from layout direction.
 */
export function applyLocaleOverride(next: Locale): void {
  locale = next;
  isRTL = next === "ar";
}

// Mobile-only strings. The shared web catalog is ported verbatim in
// ar.json / en.json; these are labels unique to the native app shell.
const mobile = {
  ar: {
    tab: { home: "الرئيسية", browse: "تصفّح", messages: "المحادثات", notifications: "الإشعارات", profile: "حسابي" },
    home: { categories: "التصنيفات", featured: "إعلانات مميّزة", empty: "لا توجد إعلانات بعد" },
    browse: { search: "ابحث عن غرض…", all: "الكل", newest: "الأحدث", mostViewed: "الأكثر مشاهدة", empty: "لا توجد إعلانات تطابق بحثك", emptyHint: "جرّب تعديل عوامل التصفية أو البحث." },
    detail: { save: "حفظ", saved: "محفوظ", views: "{count} مشاهدة", notFound: "لم يُعثر على الإعلان", conditions: { new: "جديد", used: "مستعمل" } },
    profile: { signInPrompt: "سجّل الدخول لعرض ملفك وإعلاناتك ومحفوظاتك", signInTitle: "سجّل الدخول إلى حسابك", signIn: "تسجيل الدخول", signOut: "تسجيل الخروج", saved: "المحفوظات", myListings: "إعلاناتي" },
    saved: { title: "المحفوظات", empty: "لم تحفظ أي شيء بعد", signInTitle: "سجّل الدخول لعرض المحفوظات", signInBody: "احفظ الإعلانات التي تعجبك واعثر عليها هنا في أي وقت." },
    connections: { signInTitle: "سجّل الدخول لعرض المتابعين", signInBody: "سجّل الدخول لعرض المتابِعين والمتابَعين." },
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
    browse: { search: "Search for an item…", all: "All", newest: "Newest", mostViewed: "Most viewed", empty: "No listings match your search", emptyHint: "Try adjusting your filters or search." },
    detail: { save: "Save", saved: "Saved", views: "{count} views", notFound: "Listing not found", conditions: { new: "New", used: "Used" } },
    profile: { signInPrompt: "Sign in to see your profile, listings, and saved items", signInTitle: "Sign in to your account", signIn: "Sign in", signOut: "Sign out", saved: "Saved", myListings: "My listings" },
    saved: { title: "Saved", empty: "You haven't saved anything yet", signInTitle: "Sign in to see saved items", signInBody: "Save listings you like and find them here anytime." },
    connections: { signInTitle: "Sign in to see connections", signInBody: "Sign in to view followers and following." },
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

/**
 * Raw catalog lookup for NON-string values — arrays of items/sections that drive
 * list UIs verbatim from the shared catalog (e.g. `support.topics`,
 * `terms.sections`). Falls back to English, then to an empty array.
 */
export function tList<T = unknown>(key: string): T[] {
  const raw = lookup(catalog[locale], key) ?? lookup(catalog.en, key);
  return Array.isArray(raw) ? (raw as T[]) : [];
}
