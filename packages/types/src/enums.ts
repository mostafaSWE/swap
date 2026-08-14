/** Shared domain enums / union types used across web, mobile, and the database. */

export const LISTING_CONDITIONS = ["new", "used"] as const;
export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

export const LISTING_STATUSES = ["active", "hidden", "removed", "completed"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const REPORT_TARGET_TYPES = ["listing", "user", "message", "conversation"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_STATUSES = ["pending", "reviewed", "resolved", "rejected"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// Lifecycle of a public account-deletion request (migration 0022): filed from the
// web form by someone who cannot sign in, then actioned by an admin.
export const ACCOUNT_DELETION_REQUEST_STATUSES = ["pending", "completed", "rejected"] as const;
export type AccountDeletionRequestStatus = (typeof ACCOUNT_DELETION_REQUEST_STATUSES)[number];

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/* ── Push notifications (M5) ── */
export const DEVICE_PLATFORMS = ["ios", "android"] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export const PUSH_PROVIDERS = ["expo", "fcm", "apns"] as const;
export type PushProviderKind = (typeof PUSH_PROVIDERS)[number];

export const APP_ENVS = ["development", "preview", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export const PUSH_OUTBOX_STATUSES = ["pending", "sent", "failed", "skipped"] as const;
export type PushOutboxStatus = (typeof PUSH_OUTBOX_STATUSES)[number];

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
