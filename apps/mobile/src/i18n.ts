import { I18nManager } from "react-native";

export type Locale = "ar" | "en";

/** Detect the device locale without a native module — Hermes (SDK 57) ships full
 *  ICU, so Intl is available. Device-locale via expo-localization + a full
 *  next-intl catalog port are M1 follow-ups; this covers the nav shell. */
function detectLocale(): Locale {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale ?? "en";
    return tag.toLowerCase().startsWith("ar") ? "ar" : "en";
  } catch {
    return "ar";
  }
}

export const locale: Locale = detectLocale();
export const isRTL = locale === "ar";

// Allow RTL so Arabic text and logical layout render correctly. A full
// forceRTL toggle (which requires an app reload to flip the layout axis) is a
// follow-up — see docs/mobile-release-plan.md, Phase M1.
I18nManager.allowRTL(true);

const messages = {
  ar: {
    "nav.home": "الرئيسية",
    "nav.browse": "تصفّح",
    "nav.messages": "المحادثات",
    "nav.notifications": "الإشعارات",
    "nav.profile": "حسابي",
    "home.categories": "التصنيفات",
    "home.featured": "إعلانات مميّزة",
    "home.empty": "لا توجد إعلانات بعد",
    "common.soon": "قريبًا",
    "browse.soon": "التصفّح والبحث — المرحلة M2",
    "messages.soon": "المحادثات في الوقت الفعلي — المرحلة M3",
    "notifications.soon": "مركز الإشعارات — المرحلة M3",
    "profile.soon": "الملف الشخصي والإعدادات — المرحلة M3",
  },
  en: {
    "nav.home": "Home",
    "nav.browse": "Browse",
    "nav.messages": "Messages",
    "nav.notifications": "Alerts",
    "nav.profile": "Profile",
    "home.categories": "Categories",
    "home.featured": "Featured listings",
    "home.empty": "No listings yet",
    "common.soon": "Coming soon",
    "browse.soon": "Browse & search — Phase M2",
    "messages.soon": "Realtime messaging — Phase M3",
    "notifications.soon": "Notification center — Phase M3",
    "profile.soon": "Profile & settings — Phase M3",
  },
} as const;

export type MessageKey = keyof (typeof messages)["en"];

export function t(key: MessageKey): string {
  return messages[locale][key] ?? messages.en[key] ?? key;
}
