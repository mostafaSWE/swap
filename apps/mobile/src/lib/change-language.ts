import { DevSettings, I18nManager } from "react-native";
import * as Updates from "expo-updates";
import { locale as currentLocale, type Locale } from "../i18n";
import { setStoredLocale } from "./locale-store";

/**
 * Switch the in-app language (the in-app control the boot guard's comment reserves
 * as "Option A"). Persists the choice, flips the native layout direction, and
 * reloads — the reloaded instance reads the persisted override in the boot guard
 * and comes up fully in the new language + direction. Because ar⇄en always flips
 * RTL, a reload is always required; there is no in-place text-only swap (that would
 * leave text and layout direction disagreeing).
 *
 * Returns `false` (no reload) when the target equals the current locale.
 */
export async function changeLanguage(next: Locale): Promise<boolean> {
  if (next === currentLocale) return false;
  await setStoredLocale(next);
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(next === "ar");
  try {
    await Updates.reloadAsync();
  } catch {
    // expo-updates reloadAsync is unavailable in some dev/edge configs (the same
    // caveat the boot guard notes). DevSettings.reload() reloads the JS bundle in
    // dev; forceRTL is already persisted, so the reloaded instance self-corrects.
    DevSettings.reload();
  }
  return true;
}
