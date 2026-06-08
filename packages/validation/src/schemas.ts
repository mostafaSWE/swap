import { z } from "zod";
import {
  LISTING_CONDITIONS,
  LISTING_STATUSES,
  REPORT_TARGET_TYPES,
  REPORT_STATUSES,
  SORT_OPTIONS,
  VERIFICATION_TYPES,
  VERIFICATION_STATUSES,
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

export const listingFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(), // slug
  country: uuid.optional(),
  city: uuid.optional(),
  condition: z.enum(LISTING_CONDITIONS).optional(),
  verified: z.coerce.boolean().optional(),
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

/* ── Verification ── */
export const createVerificationSchema = z.object({
  type: z.enum(VERIFICATION_TYPES),
  listing_id: uuid.optional().nullable(),
  country_id: uuid.optional().nullable(),
  city_id: uuid.optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});
export type CreateVerificationInput = z.infer<typeof createVerificationSchema>;

export const updateVerificationSchema = z.object({
  status: z.enum(VERIFICATION_STATUSES),
  notes: z.string().max(1000).optional().nullable(),
});
export type UpdateVerificationInput = z.infer<typeof updateVerificationSchema>;

/* ── Admin ── */
export const adminUpdateUserSchema = z.object({
  is_verified: z.boolean().optional(),
  is_suspended: z.boolean().optional(),
  is_admin: z.boolean().optional(),
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const adminUpdateListingSchema = z.object({
  status: z.enum(LISTING_STATUSES).optional(),
  is_featured: z.boolean().optional(),
  is_verified_item: z.boolean().optional(),
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
