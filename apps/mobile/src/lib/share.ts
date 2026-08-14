import { Share } from "react-native";
import { locale, t } from "../i18n";
import { beginTrustedNativeFlow, endTrustedNativeFlow } from "./biometrics";

/**
 * Canonical public site (matches the deployed web + the App Links / Universal
 * Links domain). Never invent an alternate domain.
 */
export const SITE_URL = "https://justswap.me";

/** Locale-prefixed canonical URL for a public web page (web routes are /[locale]/…). */
export function canonicalUrl(path: string): string {
  return `${SITE_URL}/${locale}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Native share sheet for a listing (mirrors the web ShareButton). Cancellation is a no-op. */
export async function shareListing(id: string, title: string): Promise<void> {
  const url = canonicalUrl(`/listings/${id}`);
  // The share sheet pauses the Activity; on Android that reads as `background`, which
  // would trip the app lock on return. Mark it as a trusted in-app excursion.
  beginTrustedNativeFlow();
  try {
    await Share.share({ title, message: t("share.listingMessage", { title, url }), url });
  } catch {
    /* user cancelled / share unavailable */
  } finally {
    endTrustedNativeFlow();
  }
}

/** Native share sheet for a public profile. */
export async function shareProfile(username: string, name: string): Promise<void> {
  const url = canonicalUrl(`/users/${username}`);
  beginTrustedNativeFlow();
  try {
    await Share.share({ title: name, message: t("share.profileMessage", { name, url }), url });
  } catch {
    /* user cancelled / share unavailable */
  } finally {
    endTrustedNativeFlow();
  }
}
