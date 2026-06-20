/** Shared domain enums / union types used across web, mobile, and the database. */

export const LISTING_CONDITIONS = ["new", "used"] as const;
export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

export const LISTING_STATUSES = ["active", "hidden", "removed", "completed"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const REPORT_TARGET_TYPES = ["listing", "user", "message", "conversation"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_STATUSES = ["pending", "reviewed", "resolved", "rejected"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ar";

export const SORT_OPTIONS = ["newest", "most_viewed"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

// Swap-proposal lifecycle (the core barter mechanic):
//   pending → countered → agreed → awaiting_confirmation → completed | disputed | cancelled
export const SWAP_PROPOSAL_STATUSES = [
  "pending",
  "countered",
  "agreed",
  "awaiting_confirmation",
  "completed",
  "disputed",
  "cancelled",
] as const;
export type SwapProposalStatus = (typeof SWAP_PROPOSAL_STATUSES)[number];

// In-app notification kinds (spec §3.7). Created by DB triggers on the source
// tables; the UI renders localized text from the type + actor name.
export const NOTIFICATION_TYPES = [
  "proposal_received",
  "proposal_countered",
  "proposal_accepted",
  "proposal_cancelled",
  "swap_confirm_pending",
  "swap_completed",
  "swap_disputed",
  "new_message",
  "new_follower",
  "new_rating",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
