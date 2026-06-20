# JustSwap — Roadmap

## Phase 1.7 — Proposals foundation + trust model ✅ (this repo)

- **Swap-proposal backend** (`0005_proposals.sql`): `swap_proposals` +
  `swap_proposal_items` (bundles), `conversations.proposal_id`, RLS, and a NestJS
  `ProposalsModule` (create / counter / accept / decline / cancel / list).
- **Removed identity & item verification entirely** — collecting national IDs is
  legally restricted in the GCC and not reliable. Dropped `verification_requests`,
  `profiles.is_verified`, `listings.is_verified_item`, the verification module/UI,
  and all verified badges.
- **Trust pivot:** `profiles.completed_swaps_count` (+1 per party on an undisputed
  completed swap) + ratings, surfaced via a `SwapCountBadge`.

## Phase 1.6 — Live database integration ✅

- **Database-first**: removed the silent demo fallback; demo data is gated behind
  `NEXT_PUBLIC_USE_DEMO_DATA` (dev only). Query errors now surface as empty states,
  not fake data.
- Admin overview, all admin tables (users, listings, reports,
  **categories/countries/cities**) read live from the DB.
- **Saved listings** wired end-to-end: backend endpoints (`POST/DELETE
  /listings/:id/save`, `GET /me/saved`), `@swap/api` client methods + queries,
  a `SaveButton`, and a DB-backed Saved page.
- Expanded `supabase/seed.sql`: 12 login-ready demo users (1 admin),
  44 listings across categories/GCC/statuses, follows, saved listings, 8
  conversations + messages, reports, admin-action log.

## Phase 1.5 — Backend API + polish ✅

- **NestJS backend API** (`/api/v1`) — auth/profile, listings (+ signed image
  upload), catalog, conversations/messages, follows, reports, admin
  (with `admin_actions` audit log), safety; Swagger at `/api/docs`
- Shared `@swap/validation` (zod) used by API DTOs + frontend forms
- Shared `@swap/api` REST client (web + mobile) with Supabase fallback
- Mutations routed through the API (create listing, follow, report, chat,
  admin actions); reads + Realtime stay on Supabase
- Inclusive 26-category taxonomy (parent/child) + ~98 curated bilingual GCC cities
- Desktop-responsive layouts (multi-column grids, two-column listing detail,
  two-pane chat, two-column profile, full-width admin), subtle animations,
  skeleton loaders

## Phase 1 — Base MVP foundation ✅

- Monorepo (pnpm + Turborepo): web, mobile skeleton, shared packages
- Arabic-first RTL + English LTR (`next-intl`, `/ar` `/en`)
- GCC countries + cities + categories (shared constants + DB seed)
- Supabase: schema, RLS, storage buckets, seed data
- Auth (email + password), profiles, edit profile
- Listings: create (with image upload), browse, filter/search, detail page
- Chat: conversations list + realtime chat room
- Follow + report
- Admin dashboard skeleton + management tables
- Platform responsibility disclaimers
- (Trust via completed-swaps count — identity verification intentionally never built)

## Phase 2 — Depth & trust

- Better chat: read receipts, typing, image messages, block, pagination
- Notifications (in-app + push)
- Ratings & reviews after an exchange (feeds the trust score alongside completed-swaps)
- **Payments** for featured ads + extra images
- Featured listings surfacing & ranking
- Saved listings UI, my-listings management (edit/hide/remove)
- Admin actions wired (suspend, hide, soft-delete → `admin_actions`)
- Restrict `chat-images` to conversation participants

## Phase 3 — Scale & native

- Full iOS + Android apps (reusing shared packages) + store deployment
- AI matching ("your item ↔ likely wanted items")
- Maps / location-based discovery
- Video uploads
- Moderation tooling & analytics dashboards

## Monetization (introduced in Phase 2)

No payment exists in Phase 1 — only DB fields and `TODO`s. Premium services will
be priced per market using `countries.currency_code`:

- Featured ads · Extra images

(Paid "verification" is intentionally excluded — JustSwap does not verify identity.)
