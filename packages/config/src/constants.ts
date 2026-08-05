/** App-wide constants and business rules shared across web + mobile. */

export const APP_NAME = "JustSwap";

export const SLOGAN = {
  ar: "بدّل ما لديك بما تحتاجه",
  en: "Exchange what you have for what you need",
} as const;

/**
 * Terms/EULA acceptance version (Apple Guideline 1.2 / Google UGC). A **monotonic
 * integer**: bump it whenever the Terms or the zero-tolerance UGC policy change,
 * to force every user to re-consent before their next UGC write. This is the
 * single source of truth for the app layer; the DB mirrors it in the
 * `current_terms_version()` function (migration 0018) — **bump both together.**
 * `TERMS_LAST_UPDATED` is the human-facing date shown on the Terms screen.
 */
export const TERMS_VERSION = 1;
export const TERMS_LAST_UPDATED = "2026-06-20";

/** Free plan image limit per listing. */
export const FREE_PLAN_MAX_IMAGES = 4;

// TODO (Phase 2 — premium): paid plans raise the image limit (e.g. 10–15).
// Gate via the user's plan once payment + plans are implemented.
export const PREMIUM_PLAN_MAX_IMAGES = 15;

/** Supabase Storage bucket names. */
export const STORAGE_BUCKETS = {
  avatars: "avatars",
  listingImages: "listing-images",
  chatImages: "chat-images",
  // Private: deal-closing confirmation photos, readable by both parties + admins.
  swapConfirmations: "swap-confirmations",
} as const;

/** Listing field length limits (mirror DB CHECK/validation). */
export const LIMITS = {
  titleMax: 100,
  descriptionMax: 2000,
  wantedExchangeMax: 500,
  bioMax: 300,
  messageMax: 2000,
} as const;

// Sort options live in @swap/types (SORT_OPTIONS / SortOption); re-exported here
// for convenience so UI code can import them from @swap/config too.
export { SORT_OPTIONS, type SortOption } from "@swap/types";
