# Swap — Roadmap

## Phase 1.5 — Backend API + polish ✅ (this repo)

- **NestJS backend API** (`/api/v1`) — auth/profile, listings (+ signed image
  upload), catalog, conversations/messages, follows, reports, verification, admin
  (with `admin_actions` audit log), safety; Swagger at `/api/docs`
- Shared `@swap/validation` (zod) used by API DTOs + frontend forms
- Shared `@swap/api` REST client (web + mobile) with Supabase fallback
- Mutations routed through the API (create listing, follow, report, chat, verify,
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
- Verified account / verified item: DB fields, badges, manual admin flow
- Admin dashboard skeleton + management tables
- Platform responsibility disclaimers

## Phase 2 — Depth & trust

- Better chat: read receipts, typing, image messages, block, pagination
- Notifications (in-app + push)
- Ratings & reviews after an exchange
- Full verification workflow (requests → review → badge) + **payments**
  (account verification, item verification, featured ads, extra images)
- Featured listings surfacing & ranking
- Saved listings UI, my-listings management (edit/hide/remove)
- Admin actions wired (verify, suspend, hide, soft-delete → `admin_actions`)
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

- Verified Account · Verified Item · Featured ads · Extra images
