/** App-wide constants and business rules shared across web + mobile. */

export const APP_NAME = "JustSwap";

export const SLOGAN = {
  ar: "بدّل ما لديك بما تحتاجه",
  en: "Exchange what you have for what you need",
} as const;

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
