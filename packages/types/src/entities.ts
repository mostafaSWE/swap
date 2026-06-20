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
  NotificationType,
  ReportStatus,
  ReportTargetType,
  SwapProposalStatus,
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
  /** Null for top-level categories; references another category for subcategories. */
  parent_id: string | null;
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
  is_admin: boolean;
  is_suspended: boolean;
  /** Permanent ban (admin moderation, 0010). Banned users are rejected on every authenticated request. */
  is_banned: boolean;
  /** When a temporary suspension lifts. NULL while suspended = indefinite. Past = treated as lifted. */
  suspended_until: string | null;
  /** Admin-supplied reason for the current suspension/ban; surfaced to the user. */
  suspension_reason: string | null;
  followers_count: number;
  following_count: number;
  listings_count: number;
  /** Trust signal: successful swaps where neither party disputed. */
  completed_swaps_count: number;
  /** Average of all ratings this user received (1–5, 1dp), or null with none. Maintained by the ratings trigger. */
  rating: number | null;
  /** Number of ratings this user has received. Maintained by the ratings trigger. */
  ratings_count: number;
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
  | "followers_count"
  | "following_count"
  | "listings_count"
  | "completed_swaps_count"
  | "rating"
  | "ratings_count"
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
  /** The swap proposal this conversation is tied to, if any (spec §3.5). */
  proposal_id: string | null;
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

/**
 * A block: `blocker_id` has blocked `blocked_id` (spec §3.8). Blocking hides each
 * party's active listings from the other and prevents messaging between them. The
 * relationship is one-directional in storage but enforced bidirectionally.
 */
export type Block = {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

export type ListingView = {
  id: string;
  listing_id: string;
  user_id: string | null;
  ip_hash: string | null;
  created_at: string;
};

export type AdminAction = {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  notes: string | null;
  /** Actor IP captured at action time (spec §4.1). */
  ip: string | null;
  created_at: string;
};

/**
 * An in-app notification (spec §3.7) — one row per recipient per event, created
 * by DB triggers on the source tables. `actor_id` is who triggered it; the
 * proposal/conversation links resolve the click target. The UI renders the text
 * from `type` + the actor's name (no stored copy → stays localizable).
 */
export type Notification = {
  id: string;
  /** The recipient. */
  user_id: string;
  type: NotificationType;
  /** Who triggered it (null if that account was deleted). */
  actor_id: string | null;
  proposal_id: string | null;
  conversation_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type SwapProposal = {
  id: string;
  /** Target listing being requested (owned by the recipient). */
  listing_id: string;
  /** User A — makes the offer. */
  proposer_id: string;
  /** User B — owns the target listing. */
  recipient_id: string;
  conversation_id: string | null;
  status: SwapProposalStatus;
  note: string | null;
  /** Whose turn it ISN'T — the participant who made the last move. */
  last_actor_id: string;
  created_at: string;
  updated_at: string;
};

export type SwapProposalItem = {
  id: string;
  proposal_id: string;
  /** One of the proposer's listings offered in the swap (bundle = many). */
  listing_id: string;
  created_at: string;
};

/**
 * A deal-closing confirmation: one row per party. Each side uploads a photo of
 * the item they received; when both have, the swap completes (spec §3.4). The
 * photo lives in the private `swap-confirmations` bucket — `photo_path` is the
 * storage path, signed on read (visible to both parties + admins).
 */
export type SwapConfirmation = {
  id: string;
  proposal_id: string;
  /** The party (proposer or recipient) who uploaded this confirmation. */
  user_id: string;
  photo_path: string;
  created_at: string;
};

/**
 * A post-swap rating (spec §3.4 / §3.6 / §3.9): after a swap completes, either
 * party may leave the other 1–5 stars + optional review text. One row per rater
 * per swap (re-rating updates it). Each rating keeps the ratee's
 * `profiles.rating` (average) + `profiles.ratings_count` in sync.
 */
export type Rating = {
  id: string;
  proposal_id: string;
  /** Who left the rating. */
  rater_id: string;
  /** The party being rated (the other side of the swap). */
  ratee_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

/* ── Composed view models (joined data the UI commonly needs) ── */

/** A listing with just its images — lightweight, for proposal item previews. */
export type ListingWithImages = Listing & { images: ListingImage[] };

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
  /** Status of the swap proposal this conversation is tied to, if any (spec §3.5). */
  proposal_status: SwapProposalStatus | null;
};

export type SwapProposalWithRelations = SwapProposal & {
  /** The target listing (the recipient's item being requested). */
  listing: ListingWithRelations;
  /** The proposer's offered listings (1..n — bundle support). */
  offered_items: ListingWithImages[];
  proposer: PublicProfile;
  recipient: PublicProfile;
};

/**
 * A confirmation photo resolved for display: a time-limited signed URL plus the
 * party who uploaded it. The private `photo_path` is never exposed to the UI.
 */
export type SwapConfirmationView = {
  user_id: string;
  photo_url: string;
  created_at: string;
};

/** A rating with the rater's public profile — for the reviews list on a profile. */
export type RatingWithRater = Rating & { rater: PublicProfile };

/** A notification with its actor's public profile — for the notification center. */
export type NotificationWithActor = Notification & { actor: PublicProfile | null };
