# Swap — AI Agent Master Build Prompt
> This is the immutable product spec. Read it once per project, not once per session.
> For session continuity (what's done, what's next), read BUILD_PLAN.md instead.

---

## 0. Context & Starting Point

You are building **Swap (بدّل)** — a barter marketplace for the GCC. An MVP already exists with working auth and listing creation. You are not starting from zero. Before touching any code in a new area, **read the existing implementation first** — understand what's already there, follow its patterns, and extend rather than rewrite.

**Core product concept:** Users list items they own, specify what they want in return, find matches, negotiate in chat, and close the deal by each uploading a photo of the item they received. Swap never handles money, payments, escrow, or shipping.

---

## 1. Tech Stack — Do Not Deviate

| Layer | Technology |
|---|---|
| Web framework | Next.js 14, App Router, TypeScript |
| Styling | Tailwind CSS + CSS variables for design tokens |
| i18n | next-intl — default locale `ar` (RTL), secondary `en` (LTR) |
| Backend | NestJS at `apps/api` — owns ALL mutations and business logic |
| Database / Auth | Supabase (Postgres + RLS + Auth + Storage + Realtime) |
| Validation | Zod — shared via `@swap/validation` |
| Forms | react-hook-form + zod |
| Mobile | Expo (React Native) — shares all `packages/*` |
| Data fetching | React Query (TanStack Query) + typed `@swap/api` client |
| Monorepo | pnpm workspaces + Turborepo |

```
swap/
├─ apps/
│  ├─ web/        Next.js 14 (App Router, TypeScript, Tailwind CSS)
│  ├─ api/        NestJS backend  (/api/v1 · Swagger at /api/docs)
│  └─ mobile/     Expo React Native
├─ packages/
│  ├─ types/      Shared domain + DB TypeScript types
│  ├─ config/     Theme tokens, countries, cities, categories, safety text
│  ├─ validation/ Shared zod schemas (API DTOs + frontend forms)
│  ├─ api/        Supabase client + typed REST client
│  └─ ui/         Cross-platform-safe helpers
├─ supabase/
│  ├─ migrations/
│  └─ seed.sql
└─ docs/
```

---

## 2. Design System & Visual Identity

Design quality is the top priority. Every decision must be intentional — this should not look like a marketplace template.

### 2.1 Principles

- **Arabic-first, not Arabic-afterthought.** RTL is the default. LTR is a complete mirror. Test both on every component.
- **Mobile-first at every step.** The web UI must be structured so that converting to React Native is a mapping exercise, not a redesign. Flex column-first, 44×44px minimum tap targets, swipe-friendly patterns.
- **Trust as a visual language.** Completed-swap counts, unambiguous status indicators, clear copy — the UI must signal reliability without ever implying Swap vouches for a user's identity.
- **Restraint over decoration.** One signature element per screen. Everything else serves it.

### 2.2 Token System

Define in `packages/config/theme.ts`, expose as Tailwind config + CSS variables:

```
--color-sand:       #F7F4EE   page background (warm off-white)
--color-ink:        #1A1713   primary text
--color-ink-muted:  #5C564E   secondary text
--color-swap:       #E8572A   brand accent (terracotta-orange)
--color-swap-tint:  #FDF1EC   accent tint for backgrounds
--color-trust:      #1E8A5E   trust green (completed-swaps accent)
--color-danger:     #D93025   errors + moderation
--color-border:     #E4DDD3   subtle borders
--color-surface:    #FFFFFF   cards, modals, drawers
--color-overlay:    rgba(26,23,19,0.48)

--font-display:     'Noto Serif Arabic', Georgia, serif
--font-body:        'IBM Plex Sans Arabic', system-ui, sans-serif
--font-display-en:  'Fraunces', Georgia, serif
--font-body-en:     'Inter', system-ui, sans-serif

--radius-sm: 6px  --radius-md: 12px  --radius-lg: 20px  --radius-full: 9999px
--shadow-card:  0 1px 3px rgba(26,23,19,0.08), 0 4px 16px rgba(26,23,19,0.06)
--shadow-modal: 0 8px 32px rgba(26,23,19,0.18)
```

**The signature element:** The swap icon — two arrows forming a circle — is the living motif: nav logo, deal-closed animation, empty state watermark, favicon. It always signals an active or possible exchange. Never use it decoratively.

### 2.3 Component Standards

- `:focus-visible` rings using `--color-swap` on all interactive elements
- Skeleton loaders, never spinners
- Every empty state: motif illustration + plain explanation + one clear action
- Toasts at the bottom of the viewport (thumb-friendly), with explicit icons
- Drawer/sheet (slides up from bottom) on mobile instead of dropdowns where possible

---

## 3. Feature Specification

### 3.1 Authentication
- Supabase Auth: email/password + OTP
- Post-signup profile setup: display name, city (GCC picker), avatar
- JWT forwarded to NestJS as Bearer; NestJS validates with Supabase public key

### 3.2 Listings
**Fields:** title (ar + en), description, category + subcategory, up to 8 photos, condition (New / Like New / Good / Fair), city + district, **"open to swap for"** (categories or free text), status (active / paused / swapped)

**Listing card:** primary image, title, city, condition badge, "open for" summary, time ago, save button

**Listing detail:** full image gallery (swipeable), all fields, seller mini-card with follow button, "Propose a Swap" CTA, share button, report button

### 3.3 Discovery & Search
- **Home feed:** recent listings, personalized by category preferences
- **Explore:** browse by category grid
- **Search:** full-text (Postgres `tsvector`) with filters: category, city, condition
- **Matching:** on listing detail, show "They may want" — current user's listings that match the lister's wanted categories
- **Saved listings:** bookmarked items page

### 3.4 Swap Proposal Flow ← Core loop

**States:** `pending → countered → agreed → awaiting_confirmation → completed | disputed | cancelled`

1. **Propose:** User A taps "Propose a Swap" on User B's listing. Drawer shows User A's listings. User A picks one (or bundle) + optional note. API creates `swap_proposal` + linked `conversation`.
2. **User B** can: Accept / Counter / Decline. Counter re-opens the listing picker.
3. **Agreed:** both users arrange the physical handover outside the app.
4. **Deal Closing:** "We've exchanged" button appears. Both users upload a photo of the item they received. API verifies both uploads → sets status `completed`. Animated confirmation (swap-circle). Rating prompt shown.
5. **Dispute path:** "Something went wrong" button creates a report visible to admins.

### 3.5 Conversations / Chat
- Transport: Supabase Realtime on `messages` table
- Each conversation is tied to exactly one `swap_proposal`
- Conversation list (Inbox): avatar, last message preview, proposal status badge, unread count
- Chat view: bubble layout (RTL-mirrored), proposal context card pinned at top, status banner
- Unread counts in nav

### 3.6 User Profiles
- Public: avatar, name, city, completed-swaps count, listings grid, ratings, follow button
- Own: editable profile + notification settings
- Follow system: followers/following counts, "Following" feed tab on home
- Trust signals: completed swap count, avg rating (no identity verification — see §3.9)

### 3.7 Notifications
- In-app notification center (bell in nav)
- Triggers: new proposal, proposal state change, new message, deal closed, new follower
- Web push Phase 1; native push in mobile phase

### 3.8 Reports & Safety
- Report any listing or user (categories: Prohibited item, Fake/misleading, Spam, Inappropriate, Scam)
- Auto soft-hide at configurable threshold (`REPORT_AUTO_HIDE_THRESHOLD`, default 5)
- Safety copy shown on proposal confirm screen (from `@swap/config/safety`)
- Block user: hides listings from each other, prevents messaging

### 3.9 Trust & Reputation
Swap does **not** verify user identity. Collecting or storing national IDs is legally restricted across the GCC and is not a reliable signal anyway, so there is **no identity-verification flow and no "verified account" or "verified item" badge.** Trust is earned through activity and surfaced publicly:
- **Completed-swaps count** — the primary trust signal. Each party gets **+1** when a swap reaches `completed` and neither side disputes it within the dispute window. Shown beside the user's name on profiles, the seller mini-card, and (for the owner) listing context.
- **Ratings** — post-swap 1–5 stars + optional text (see §3.4), averaged on the profile.
- Stored on `profiles.completed_swaps_count` (and `profiles.rating`). The count is incremented by the deal-closing flow, never by an admin.

---

## 4. Admin Panel

Completely separate from the user-facing app. Separate login. Admin credentials ≠ regular user accounts.

### 4.1 Admin Auth
- Supabase Auth with `is_admin = true` guard on NestJS
- Every admin write action logged to `admin_actions` (actor, action, target, timestamp, IP)
- Session timeout: 2 hours

### 4.2 Analytics Dashboard (landing page after login)
- **Cards:** Total users, Active listings, Completed swaps, Open proposals, Pending reports — each with 30-day sparkline
- **Charts** (Recharts): daily new users + listings (line, 90 days), swap completions per week (bar), category breakdown (donut), city breakdown (horizontal bar), proposal funnel (Proposals → Agreed → Completed)
- Date-range picker wired to all charts

### 4.3 User Moderation
- Searchable/filterable user table
- User detail: full profile, listing history, swap history, report history, admin notes
- Actions: Suspend (duration + reason), Ban, Unsuspend, Send system message

### 4.4 Listing Moderation
- Queue with filter tabs: all / reported / flagged
- Actions: Approve, Remove (reason notified to user), Feature on homepage, Request edits
- Bulk actions: bulk remove, bulk feature

### 4.5 Reports Queue
- Sorted by severity + age. Each shows: reporter, target, category, description
- Actions: Dismiss, Warn user, Remove listing, Suspend user

---

## 5. Mobile Applications

### 5.1 Philosophy
- `apps/mobile` (Expo) shares all `packages/*` and the same NestJS API
- Web UI must be designed so every screen has a clear React Native analogue:
  - No CSS tricks without an RN equivalent
  - Navigation maps 1:1 to Expo Router
  - Business logic in hooks inside `packages/api` or `packages/ui`, not component files

### 5.2 Mobile-Specific (Phase 7)
- Push notifications via Expo Notifications
- Camera for listing photos + confirmation photos
- Biometric login, share sheet, deep linking
- EAS Build configured for both platforms

---

## 6. Architecture Rules

### Backend (NestJS)
- One module per domain: `auth`, `users`, `listings`, `proposals`, `conversations`, `messages`, `notifications`, `reports`, `admin`, `storage`
- Controllers are thin routers. All logic in services.
- DTOs are thin wrappers around shared `@swap/validation` zod schemas
- All writes use service-role Supabase client + app-level authorization
- Every endpoint documented in Swagger
- Error responses follow RFC 7807

### Frontend (Next.js)
- Route groups: `(public)` for non-auth, `(app)` for authenticated users, `(admin)` for admin
- Server Components for data-fetching shells; Client Components only at leaf level
- React Query for all client-side data
- All text through `next-intl` `t()` — zero hardcoded strings

### Shared Packages
- `@swap/types` — plain TS interfaces, no runtime code
- `@swap/validation` — Zod schemas per domain, each exports base/create/update schema + inferred type
- `@swap/config` — pure data: categories, cities, safety copy, theme tokens
- `@swap/api` — typed REST client + Supabase factories. All query/mutation functions live here.
- `@swap/ui` — formatting helpers, no React import (works in RN)

### Database
- Every table: `id uuid DEFAULT gen_random_uuid()`, `created_at`, `updated_at`
- RLS mandatory on every user-facing table
- Indexes on all FK columns and WHERE/ORDER BY columns in hot queries

---

## 7. Build Phases

Work through phases in order. Each phase has an exit criterion — the codebase must be in a working, deployable state before moving on. Track progress in `BUILD_PLAN.md`.

---

### Phase 1 — Foundation
Infrastructure, packages, DB schema, all apps scaffold and connected.

- [ ] Turborepo pipeline working for all apps and packages
- [ ] `packages/config`: theme tokens, categories (Electronics, Clothing, Books, Furniture, Sports, Kids, Collectibles, Other — 4–6 subcategories each), GCC cities, safety copy
- [ ] `packages/types`: all domain interfaces (User, Listing, SwapProposal, Conversation, Message, Notification, Report, AdminAction)
- [ ] `packages/validation`: zod schemas for all domains
- [ ] `supabase/migrations/0001_schema.sql`: all tables with correct columns, constraints, FKs
- [ ] `supabase/migrations/0002_rls.sql`: RLS policies for every table
- [ ] `supabase/migrations/0003_storage.sql`: buckets (`listing-images`, `avatars`, `swap-confirmations`) with access policies
- [ ] `packages/api`: Supabase client factory, placeholder query functions
- [ ] `apps/api`: scaffold, Supabase auth middleware, health-check, Swagger
- [ ] `apps/web`: Next.js 14, Tailwind with full token system, next-intl with ar/en, root layout with RTL/LTR
- [ ] `apps/mobile`: Expo scaffold with basic tab navigator

**Exit criterion:** `pnpm dev` starts all three apps. `/api/docs` shows Swagger. Web renders in both `/ar` and `/en` with correct text direction.

---

### Phase 2 — Core Listing & Discovery
Users can sign up, create listings, and browse.

- [ ] Auth flow (web): sign up, login, OTP, forgot password — RTL + LTR
- [ ] Profile setup: post-signup onboarding (name, city, avatar)
- [ ] NestJS Listings module: CRUD endpoints + pagination + filters
- [ ] NestJS Storage module: signed upload URLs, 8-image limit, file validation
- [ ] Listing create/edit form: multi-step, image uploader with reorder, "open to swap for" picker
- [ ] Listing detail page: SSR, image gallery, all fields, SEO meta, share
- [ ] Home feed: server-rendered recent listings grid with skeleton loading
- [ ] Explore page: category grid → category listing
- [ ] Search: search bar in nav, results page with filters
- [ ] Listing card component: responsive, RTL + LTR, skeleton variant
- [ ] Saved listings: save/unsave toggle (optimistic), saved page
- [ ] `supabase/seed.sql`: 12 demo users, 44 listings across categories and cities

**Exit criterion:** User can register, create a listing with photos, another user can find and view it.

---

### Phase 3 — Proposals & Chat
The full exchange loop works end-to-end.

- [ ] NestJS Proposals module: create, counter, accept, decline, cancel, list by user
- [ ] NestJS Conversations module: create (triggered by proposal), get with messages
- [ ] NestJS Messages module: send, list
- [ ] Supabase Realtime: subscribe to messages per conversation_id
- [ ] Propose Swap drawer: opens from listing detail, shows own listings, submits
- [ ] Inbox page: conversation list with status badges and unread counts
- [ ] Chat view: real-time bubbles, proposal context card, status banner, send form
- [ ] Counter-proposal flow: "Offer a different item" re-opens listing picker
- [ ] Deal Closing flow: "We've exchanged" button, both users upload confirmation photo, API checks both → completed, animated confirmation screen
- [ ] Rating / Review: post-deal, 1–5 stars + optional text
- [ ] Notification triggers: stored in `notifications` table
- [ ] In-app notification center: bell icon, dropdown/page

**Exit criterion:** Full swap lifecycle works — propose, counter, agree, confirm, close — with real-time chat throughout.

---

### Phase 4 — Trust, Safety & Profiles
Platform feels safe, social layer is functional.

- [ ] User profile pages: public view + own-profile edit
- [ ] Follow system: follow/unfollow (optimistic), follower counts, "Following" feed tab
- [ ] NestJS Reports module: report listing/user, returns 202
- [ ] Report UI: accessible from listing detail and user profile menus
- [ ] Auto-flag at configurable threshold (soft-hide pending admin review)
- [ ] Safety copy banner on proposal confirmation screen
- [ ] Block user: hides listings, prevents messaging

**Exit criterion:** Reports and the follow system work. Flagged content hidden from regular feeds.

---

### Phase 5 — Admin Panel
Full analytics and moderation surface.

- [ ] Admin auth: separate login at `/admin/login`, `is_admin` guard, redirect on success
- [ ] Admin layout: sidebar with Dashboard, Users, Listings, Reports, Audit Log
- [ ] Analytics dashboard: Recharts charts as specified, date-range picker, all data from `/admin/analytics`
- [ ] Users table: paginated, searchable, filterable; actions: suspend, ban, view detail
- [ ] User detail page: full data, action buttons, admin notes, action history
- [ ] Listings queue: filter tabs, actions: approve, remove, feature, request-edits
- [ ] Reports queue: sortable, expandable, actions as specified
- [ ] Audit log page: searchable
- [ ] All admin write actions via `/admin/*` NestJS endpoints, all logged to `admin_actions`

**Exit criterion:** Admin logs in independently, views analytics, takes moderation actions that are logged and reflected in the product.

---

### Phase 6 — Polish, Performance & Web Launch
Production-ready web app.

- [ ] Full RTL/LTR audit: every page and component in both directions
- [ ] Accessibility: keyboard nav, focus management, ARIA on icon-only buttons, contrast ≥ 4.5:1
- [ ] SEO: `generateMetadata` for listing/category/profile pages, sitemap.ts, robots.ts, Open Graph
- [ ] Performance: `next/image` everywhere, lazy loading, bundle analysis, no >50 kB first-party chunk
- [ ] Error boundaries: catch-all `error.tsx` + per-route with recovery UI
- [ ] Loading states: `loading.tsx` skeletons for every route segment
- [ ] Rate limiting: NestJS Throttler, stricter on auth + upload endpoints
- [ ] Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] E2E tests: Playwright — sign up, create listing, propose swap, chat, confirm deal, admin login, admin action
- [ ] CI pipeline: GitHub Actions — type-check, lint, test, build on every PR

**Exit criterion:** Lighthouse ≥ 90 on all four categories on the listing detail page. All E2E tests pass.

---

### Phase 7 — Mobile Applications
Native iOS and Android apps sharing all business logic.

- [ ] Expo Router mirrors Next.js App Router route structure
- [ ] Shared hooks and API calls from `packages/api` — zero duplication
- [ ] Custom RN components: ListingCard, CategoryGrid, ChatBubble, ProposalBanner, BottomSheet, ImageGallery
- [ ] Navigation: tabs (Home, Explore, + Add Listing, Inbox, Profile) + nested stacks
- [ ] Camera integration: listing photos + confirmation photos
- [ ] Push notifications via Expo Notifications
- [ ] Biometric auth, share sheet, deep linking
- [ ] App Store / Play Store assets: icon, splash, screenshots
- [ ] EAS Build configured for both platforms

**Exit criterion:** Both apps installable on a physical device. Full swap lifecycle functional on mobile.

---

## 8. Code Quality Standards

- TypeScript strict mode everywhere. No `any` without an explanatory comment.
- Zod validates all external input: API request bodies, form values, env vars.
- No business logic in components. Logic lives in hooks, services, or the API layer.
- **Naming:** files `kebab-case`, components `PascalCase`, hooks `useXxx`, NestJS services `XxxService`
- **Comments:** explain *why*, not *what*. If you're explaining *what*, rewrite the code.
- **Git:** Conventional Commits — `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`
- **Env vars:** validated at startup via Zod schema. App crashes loudly on missing required vars.

---

## 9. Things to Never Do

- ❌ Never hardcode text strings in components — use `next-intl` `t()`
- ❌ Never use `!important` in CSS
- ❌ Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or mobile app
- ❌ Never write a migration without a corresponding RLS policy
- ❌ Never skip skeleton loading states
- ❌ Never put business logic in a NestJS controller
- ❌ Never allow admin panel access without a server-side `is_admin` check
- ❌ Never ship a feature without its error and empty state implemented
- ❌ Never duplicate a component that already exists in `packages/ui` or the shared component library
- ❌ Never commit `.env` files with real secrets

---

*This document is the contract. When in doubt: build the thing that improves user experience and makes the codebase easier to maintain. Those goals are almost never in conflict.*
