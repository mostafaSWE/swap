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
| `categories` | Listing categories (`name_ar/en`, slug, icon, **`parent_id`** for parent/child) |
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

## Backend API vs Supabase (security model)

Phase 1 used RLS-only with direct browser → Supabase. Phase 1.5 adds a **NestJS
API** (`apps/api`) as the business-logic layer:

- **Direct browser → Supabase** is still used for **reads** (RLS protects them) and
  **Realtime** chat subscriptions. RLS policies in `0002_rls.sql` remain the
  backstop and are unchanged.
- **Mutations + privileged workflows** go through the **API**, which:
  - verifies the Supabase access token (`Authorization: Bearer …`) and loads the
    caller's profile (rejecting suspended users),
  - uses the **service-role** key (bypasses RLS) and enforces authorization in code
    (ownership checks, `AdminGuard` for admin routes),
  - validates every body against the shared **zod** schemas (`@swap/validation`),
  - records admin mutations to `admin_actions`.

This means there are **two valid paths** to the data; both are secured (RLS for
direct reads, app-level authz for the API). No RLS policy needed to change — the
API simply has a privileged, audited path for sensitive writes. The web client
prefers the API when `NEXT_PUBLIC_API_URL` is set and falls back to Supabase
otherwise.

**Saved listings** follow the same pattern: `POST/DELETE /listings/:id/save` and
`GET /me/saved` (backend), with `saveListing`/`unsaveListing`/`getSavedListings`
in `@swap/api` for the direct-Supabase path. Saved-page reads run server-side
(RLS: a user reads only their own `saved_listings`).

The app is **database-first** — no page renders mock data when the DB is
connected. The only demo path is the explicit `NEXT_PUBLIC_USE_DEMO_DATA=true`
dev flag.

## Catalog (categories, countries, cities)

- **Categories**: `0004_catalog_expansion.sql` adds `parent_id` and an inclusive
  26-category taxonomy (+ example subcategories). Carried-over slugs keep their
  original UUIDs so demo listings stay valid. Mirrors `packages/config/categories.ts`.
- **Country/city data**: GCC countries + a **curated bilingual (ar/en)** city set
  (~98 cities). No open package ships reliable Arabic names for all GCC cities, so
  the dataset is curated by hand (English cross-checked against the
  `country-state-city` npm dataset) in `packages/config/cities.ts` and seeded via
  `0004`. Extend by appending there or via the admin "Manage cities" API.
