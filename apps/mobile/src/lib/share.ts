import { Share } from "react-native";
import { locale, t } from "../i18n";

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
  try {
    await Share.share({ title, message: t("share.listingMessage", { title, url }), url });
  } catch {
    /* user cancelled / share unavailable */
  }
}

/** Native share sheet for a public profile. */
export async function shareProfile(username: string, name: string): Promise<void> {
  const url = canonicalUrl(`/users/${username}`);
  try {
    await Share.share({ title: name, message: t("share.profileMessage", { name, url }), url });
  } catch {
    /* user cancelled / share unavailable */
  }
}
