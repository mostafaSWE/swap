/**
 * Domain entity types — one type per database table.
 * These mirror the Supabase/Postgres schema in /supabase/migrations.
 *
 * NOTE: these are declared with `type` (not `interface`) on purpose — the
 * Supabase typed client requires table Row/Insert/Update types to be assignable
 * to `Record<string, unknown>`, which interfaces are not (no implicit index
 * signature). Keep them as `type`.
 */
import type {
  ListingCondition,
  ListingStatus,
  Locale,
  ReportStatus,
  ReportTargetType,
  VerificationStatus,
  VerificationType,
} from "./enums";

export type Country = {
  id: string;
  name_ar: string;
  name_en: string;
  iso_code: string;
  phone_code: string;
  currency_code: string;
  timezone: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type City = {
  id: string;
  country_id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type Category = {
  id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  username: string;
  email: string | null;
  phone: string | null;
  country_id: string | null;
  city_id: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferred_language: Locale;
  is_verified: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  followers_count: number;
  following_count: number;
  listings_count: number;
  rating: number | null;
  created_at: string;
  updated_at: string;
};

/** Public-safe subset of a profile, exposed to other users. */
export type PublicProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "username"
  | "avatar_url"
  | "bio"
  | "country_id"
  | "city_id"
  | "is_verified"
  | "followers_count"
  | "following_count"
  | "listings_count"
  | "created_at"
>;

export type Listing = {
  id: string;
  owner_id: string;
  category_id: string;
  country_id: string;
  city_id: string;
  title: string;
  description: string;
  condition: ListingCondition;
  wanted_exchange: string;
  status: ListingStatus;
  is_verified_item: boolean;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type ListingImage = {
  id: string;
  listing_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
};

export type Conversation = {
  id: string;
  listing_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationParticipant = {
  conversation_id: string;
  user_id: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
};

export type Follow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type Report = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  created_at: string;
};

export type SavedListing = {
  user_id: string;
  listing_id: string;
  created_at: string;
};

export type ListingView = {
  id: string;
  listing_id: string;
  user_id: string | null;
  ip_hash: string | null;
  created_at: string;
};

export type VerificationRequest = {
  id: string;
  user_id: string;
  listing_id: string | null;
  type: VerificationType;
  country_id: string | null;
  city_id: string | null;
  status: VerificationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminAction = {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  notes: string | null;
  created_at: string;
};

/* ── Composed view models (joined data the UI commonly needs) ── */

export type ListingWithRelations = Listing & {
  images: ListingImage[];
  owner: PublicProfile;
  category: Category;
  country: Country;
  city: City;
};

export type ConversationPreview = Conversation & {
  other_user: PublicProfile;
  last_message: Message | null;
  unread_count: number;
};
