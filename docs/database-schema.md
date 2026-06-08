# Swap — Database Schema

All SQL lives in [`/supabase`](../supabase). Run order:

1. `migrations/0001_schema.sql` — tables, constraints, indexes, triggers, RPCs
2. `migrations/0002_rls.sql` — Row Level Security policies
3. `migrations/0003_storage.sql` — storage buckets + policies
4. `seed.sql` — reference data + demo data

The TypeScript mirror of these tables is [`packages/types`](../packages/types);
the typed Supabase `Database` is in `packages/api/src/database.types.ts`.

## Tables

| Table | Purpose |
|---|---|
| `profiles` | 1:1 with `auth.users`; public + private profile fields, counters, flags |
| `countries` | GCC countries; `name_ar/en`, ISO, phone code, currency, timezone |
| `cities` | Cities per country |
| `categories` | Listing categories (`name_ar/en`, slug, icon) |
| `listings` | Exchange listings; condition, status, wanted item, verified/featured flags |
| `listing_images` | Images per listing (free plan ≤ 4) |
| `conversations` | Chat threads, optionally tied to a listing |
| `conversation_participants` | Membership (drives chat access in RLS) |
| `messages` | Chat messages (text + optional image), read flag |
| `follows` | Follower/following edges (maintains counters via trigger) |
| `reports` | Abuse reports for listing/user/message/conversation |
| `saved_listings` | User bookmarks |
| `listing_views` | View log (bumps `listings.view_count` via trigger) |
| `verification_requests` | Account/item verification requests (manual flow) |
| `admin_actions` | Audit log of admin actions |

## Key relationships

- `profiles.id` → `auth.users.id` (created automatically by `handle_new_user`)
- `listings.owner_id` → `profiles.id`; `category_id/country_id/city_id` → refs
- `listing_images.listing_id` → `listings.id`
- `messages.conversation_id` → `conversations.id`; `sender_id` → `profiles.id`
- `conversation_participants(conversation_id, user_id)` composite PK
- `follows(follower_id, following_id)` composite PK, `follower ≠ following`

## Triggers / functions

- `set_updated_at()` — keeps `updated_at` fresh on update.
- `handle_new_user()` — inserts a `profiles` row from auth metadata on signup.
- `sync_follow_counts()` — maintains `followers_count` / `following_count`.
- `sync_listing_counts()` — maintains `listings_count`.
- `bump_listing_view_count()` — increments `view_count` on a new view.
- `get_or_create_conversation(other_user_id, p_listing_id)` — finds/creates a
  1:1 conversation, enforces "cannot message yourself".
- `is_admin(uid)` — helper used by admin RLS policies.

## RLS summary

- **Reference data** (`countries/cities/categories`): public read; admin write.
- **profiles**: public read (app selects only public-safe columns for others);
  users update only their own row; admins manage all.
- **listings**: public read of `active`; owners read/write their own; admins all.
- **listing_images**: readable if parent listing is visible; owner writes.
- **conversations/participants/messages**: participants only; sends require
  `sender_id = auth.uid()` AND membership. Admins can read (intended only when a
  report exists — enforced at the app layer).
- **reports**: any authenticated user files; reporter or admin reads; admin manages.
- **saved_listings / follows / listing_views**: owner-scoped writes.
- **verification_requests**: user creates/reads own; admin manages.
- **admin_actions**: admin only.

## Storage buckets

| Bucket | Visibility | Write rule |
|---|---|---|
| `avatars` | public read | path `{auth.uid}/…` |
| `listing-images` | public read | path `{auth.uid}/{listing_id}/…` |
| `chat-images` | **private** | MVP: owner-only by `{auth.uid}/…` path |

> **TODO (Phase 2):** restrict `chat-images` READ to all conversation
> participants (needs conversation id in the path + a join). Kept simple for MVP.
