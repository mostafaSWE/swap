import { defineRouting } from "next-intl/routing";
import { LOCALES, DEFAULT_LOCALE } from "@swap/types";

/**
 * Path-based localization: /ar and /en.
 * Arabic is the default and primary language.
 */
export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  // Always show the locale prefix so language is explicit and shareable.
  localePrefix: "always",
});
