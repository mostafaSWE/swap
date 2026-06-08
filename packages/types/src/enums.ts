/** Shared domain enums / union types used across web, mobile, and the database. */

export const LISTING_CONDITIONS = ["new", "used"] as const;
export type ListingCondition = (typeof LISTING_CONDITIONS)[number];

export const LISTING_STATUSES = ["active", "hidden", "removed", "completed"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const REPORT_TARGET_TYPES = ["listing", "user", "message", "conversation"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_STATUSES = ["pending", "reviewed", "resolved", "rejected"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const VERIFICATION_TYPES = ["account", "item"] as const;
export type VerificationType = (typeof VERIFICATION_TYPES)[number];

export const VERIFICATION_STATUSES = ["pending", "approved", "rejected", "completed"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ar";

export const SORT_OPTIONS = ["newest", "most_viewed"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];
