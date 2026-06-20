import { z } from "zod";
import {
  LISTING_CONDITIONS,
  LISTING_STATUSES,
  REPORT_TARGET_TYPES,
  REPORT_STATUSES,
  SORT_OPTIONS,
  SWAP_PROPOSAL_STATUSES,
  LOCALES,
} from "@swap/types";

/**
 * Shared zod schemas — the single source of truth for input validation.
 * The NestJS backend uses these (via a ZodValidationPipe) and the web/mobile
 * forms use them too, so client and server never disagree on the rules.
 *
 * Length limits mirror @swap/config `LIMITS`.
 */

const uuid = z.string().uuid();

/* ── Profile ── */
export const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(80).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "username may contain letters, numbers, _ and .")
    .optional(),
  phone: z.string().max(20).optional().nullable(),
  bio: z.string().max(300).optional().nullable(),
  avatar_url: z.string().url().max(2048).optional().nullable(),
  country_id: uuid.optional().nullable(),
  city_id: uuid.optional().nullable(),
  preferred_language: z.enum(LOCALES).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/* ── Listings ── */
export const createListingSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(2000).default(""),
  condition: z.enum(LISTING_CONDITIONS),
  category_id: uuid,
  country_id: uuid,
  city_id: uuid,
  wanted_exchange: z.string().max(500).default(""),
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = createListingSchema
  .partial()
  .extend({ status: z.enum(LISTING_STATUSES).optional() });
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

// Reorder a listing's images — the full id list in the desired order.
export const reorderImagesSchema = z.object({
  image_ids: z.array(uuid).min(1).max(15),
});
export type ReorderImagesInput = z.infer<typeof reorderImagesSchema>;

export const listingFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(), // slug
  country: uuid.optional(),
  city: uuid.optional(),
  condition: z.enum(LISTING_CONDITIONS).optional(),
  sort: z.enum(SORT_OPTIONS).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type ListingFiltersInput = z.infer<typeof listingFiltersSchema>;

/* ── Conversations / messages ── */
export const startConversationSchema = z.object({
  listing_id: uuid.optional().nullable(),
  other_user_id: uuid,
});
export type StartConversationInput = z.infer<typeof startConversationSchema>;

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
  image_url: z.string().url().optional().nullable(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/* ── Swap proposals ── */
// The proposer offers 1..n of their own listings for ONE target listing.
export const MAX_PROPOSAL_ITEMS = 8;
const offeredListingIds = z.array(z.string().uuid()).min(1).max(MAX_PROPOSAL_ITEMS);

export const createProposalSchema = z.object({
  listing_id: uuid, // target listing (the recipient's item)
  offered_listing_ids: offeredListingIds,
  note: z.string().max(1000).optional().nullable(),
});
export type CreateProposalInput = z.infer<typeof createProposalSchema>;

// Counter re-opens the listing picker; the offered items always refer to the
// original proposer's listings (see proposals.service).
export const counterProposalSchema = z.object({
  offered_listing_ids: offeredListingIds,
  note: z.string().max(1000).optional().nullable(),
});
export type CounterProposalInput = z.infer<typeof counterProposalSchema>;

export const listProposalsQuerySchema = z.object({
  role: z.enum(["sent", "received", "all"]).optional(),
  status: z.enum(SWAP_PROPOSAL_STATUSES).optional(),
});
export type ListProposalsQuery = z.infer<typeof listProposalsQuerySchema>;

/* ── Deal closing (swap confirmation) ── */
// Both parties upload a photo of the item they received; when both have, the
// swap completes (spec §3.4). Uploads use a backend-signed URL, then the path
// is registered here. The backend re-derives/validates the path server-side.
export const signConfirmationSchema = z.object({
  fileName: z.string().min(1).max(200),
});
export type SignConfirmationInput = z.infer<typeof signConfirmationSchema>;

export const confirmSwapSchema = z.object({
  photo_path: z.string().min(1).max(300),
});
export type ConfirmSwapInput = z.infer<typeof confirmSwapSchema>;

export const disputeSwapSchema = z.object({
  reason: z.string().max(1000).optional().nullable(),
});
export type DisputeSwapInput = z.infer<typeof disputeSwapSchema>;

/* ── Ratings (post-swap reviews) ── */
// After a swap completes, either party may rate the other 1–5 stars + optional
// text (opt-in, text-optional). The backend derives the ratee from the proposal.
export const createRatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});
export type CreateRatingInput = z.infer<typeof createRatingSchema>;

/* ── Reports ── */
export const createReportSchema = z.object({
  target_type: z.enum(REPORT_TARGET_TYPES),
  target_id: uuid,
  reason: z.string().min(1).max(100),
  description: z.string().max(1000).optional().nullable(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const updateReportSchema = z.object({ status: z.enum(REPORT_STATUSES) });
export type UpdateReportInput = z.infer<typeof updateReportSchema>;

/* ── Admin ── */
export const adminUpdateUserSchema = z.object({
  is_suspended: z.boolean().optional(),
  is_banned: z.boolean().optional(),
  is_admin: z.boolean().optional(),
  // ISO 8601; null clears the window (indefinite suspension or unsuspend).
  suspended_until: z.string().datetime().nullable().optional(),
  suspension_reason: z.string().max(500).nullable().optional(),
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

// A private moderator note about a user. Stored in admin_actions (admin-only
// readable), so it never leaks through the public-read profiles policy.
export const adminUserNoteSchema = z.object({ note: z.string().min(1).max(2000) });
export type AdminUserNoteInput = z.infer<typeof adminUserNoteSchema>;

// A system message an admin sends to a user (delivered as a normal chat message
// from the admin account → triggers the user's new_message notification).
export const adminMessageSchema = z.object({ body: z.string().min(1).max(2000) });
export type AdminMessageInput = z.infer<typeof adminMessageSchema>;

export const adminUpdateListingSchema = z.object({
  status: z.enum(LISTING_STATUSES).optional(),
  is_featured: z.boolean().optional(),
});
export type AdminUpdateListingInput = z.infer<typeof adminUpdateListingSchema>;

export const upsertCategorySchema = z.object({
  name_ar: z.string().min(1),
  name_en: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  icon: z.string().default("other"),
  parent_id: uuid.optional().nullable(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});
export type UpsertCategoryInput = z.infer<typeof upsertCategorySchema>;

export const upsertCountrySchema = z.object({
  name_ar: z.string().min(1),
  name_en: z.string().min(1),
  iso_code: z.string().length(2),
  phone_code: z.string().min(1),
  currency_code: z.string().length(3),
  timezone: z.string().min(1),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});
export type UpsertCountryInput = z.infer<typeof upsertCountrySchema>;

export const upsertCitySchema = z.object({
  country_id: uuid,
  name_ar: z.string().min(1),
  name_en: z.string().min(1),
  slug: z.string().min(1),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});
export type UpsertCityInput = z.infer<typeof upsertCitySchema>;
