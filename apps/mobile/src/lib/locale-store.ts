import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Locale } from "../i18n";

/**
 * Persisted in-app language override. When set, it wins over the device locale
 * (see `detectLocale` / the boot direction guard). Absent → the app follows the
 * device language (the D-7 default: Arabic device ⇒ Arabic, anything else ⇒ English).
 *
 * Reads/writes are wrapped so a storage failure degrades to "no override" (device
 * locale) rather than crashing boot.
 */
const KEY = "justswap.locale";

export async function getStoredLocale(): Promise<Locale | null> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    return value === "ar" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

export async function setStoredLocale(next: Locale): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, next);
  } catch {
    // Non-fatal: the switch just won't persist across a cold start.
  }
}
