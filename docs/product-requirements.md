# JustSwap — Product Requirements (Phase 1 foundation)

## The idea

**JustSwap** is a barter marketplace where users exchange goods directly with each
other. JustSwap is **not** a buying/selling platform.

> **بدّل ما لديك بما تحتاجه** — Exchange what you have for what you need

JustSwap **does not** handle money, escrow, selling, delivery, or payment between
users. It only helps users discover each other and agree on an exchange; the
actual handover happens privately between the two parties.

Examples: a pen ↔ a notebook, an air conditioner ↔ a washing machine, an iPhone
↔ another device.

## What JustSwap does

- Accounts (sign up / login / profile)
- List items to exchange (with photos + what you want in return)
- Browse, search, and filter listings
- Listing detail pages
- User-to-user chat (Supabase Realtime)
- Follow users
- Report abuse (listing / user / message / conversation)
- Trust signals: **completed-swaps count** (per user) + ratings — JustSwap does **not** verify identity

## Architecture (Phase 1.5)

A dedicated **NestJS backend API** (`apps/api`, `/api/v1`) now owns business logic
and sensitive writes; both the web app and the future mobile app consume it via the
shared `@swap/api` REST client. Supabase remains the platform (Auth, Postgres + RLS,
Storage, Realtime). See [database-schema.md](./database-schema.md) for the security
model. Validation rules live once in `@swap/validation` (zod) and are shared by the
API and the forms.

The app is **database-first**: every page and action reads/writes real
Supabase/Postgres data (no hidden mock data). A built-in demo dataset is used by
the read pages **only** when `NEXT_PUBLIC_USE_DEMO_DATA=true` (local dev without a
DB). `supabase/seed.sql` populates realistic MVP data (12 users incl. admin,
44 listings, conversations, follows, saved listings, reports).

## MVP scope (Phase 1 — this foundation)

- Monorepo (web + **backend API** + mobile skeleton + shared packages)
- Arabic-first, RTL by default; full English (LTR) support via `next-intl`
- GCC country/city support (SA, AE, QA, KW, BH, OM)
- Supabase schema, RLS, storage buckets, seed data
- Auth (email + password), profiles
- Listings: create, browse, filter, detail
- Chat (conversations + realtime messages)
- Follow + report
- Admin dashboard skeleton + management tables
- Trust: per-user **completed-swaps count** (no identity verification — see Platform responsibility)

## Explicitly NOT in Phase 1

Real payment, escrow, in-app monetary exchange, delivery/logistics, AI matching,
identity verification (intentionally never — legally restricted in the GCC),
native store deployment, full notifications, advanced analytics. The codebase is
prepared for the rest (fields + `TODO`s).

## Country & region support

Primary region: **GCC**. Each country stores `name_ar`, `name_en`, ISO code,
phone code, **default currency** (for future premium pricing), timezone, and
active status. A **curated bilingual (ar/en) city set (~98 cities)** is seeded per
country (see [database-schema.md](./database-schema.md) → Catalog). The model
supports adding more countries/cities later via the admin catalog API.

## Categories

An **inclusive 26-category taxonomy** (Electronics, Mobiles & Tablets, Computers &
Laptops, Gaming & Consoles, Home Appliances, Furniture, Home & Garden, Cars,
Motorcycles, Auto Parts, Fashion, Watches & Jewelry, Baby & Kids, Toys & Games,
Sports & Fitness, Books & Stationery, Tools & Equipment, Health & Beauty, Pets,
Musical Instruments, Cameras & Photography, Home Materials, Office & Business,
Collectibles & Antiques, Open to Any Exchange, Other) with Arabic + English names
and **parent/child** support (example subcategories seeded). Admin-manageable via
the catalog API.

## Language & localization

- Arabic is the **default** and primary language; layout is **RTL**.
- English is fully supported (LTR).
- All UI strings live in `apps/web/messages/{ar,en}.json` — never hardcoded.
- Localizable data (categories, countries, cities) carries `name_ar`/`name_en`.
- User-generated content is shown as-authored (mixed languages allowed there).

## Platform responsibility

JustSwap clearly states it does **not** own, buy, sell, guarantee, or escrow
products, does **not** verify user identity, and does **not** guarantee the
condition of any listed product. The final agreement and handover are the users'
responsibility. The disclaimer appears on listing details, before starting an
exchange chat, and on the Safety page.

## Monetization (future — no payment now)

Prepared in the schema, gated behind `TODO`s (note: identity/item *verification*
is intentionally **not** a product — see Trust & Reputation):

- **Featured listings** (`listings.is_featured`)
- **Extra images** (free plan = 4; premium = 10–15)

Country `currency_code` exists so premium services can be priced per market.
