# Swap — Product Requirements (Phase 1 foundation)

## The idea

**Swap** is a barter marketplace where users exchange goods directly with each
other. Swap is **not** a buying/selling platform.

> **بدّل ما لديك بما تحتاجه** — Exchange what you have for what you need

Swap **does not** handle money, escrow, selling, delivery, or payment between
users. It only helps users discover each other and agree on an exchange; the
actual handover happens privately between the two parties.

Examples: a pen ↔ a notebook, an air conditioner ↔ a washing machine, an iPhone
↔ another device.

## What Swap does

- Accounts (sign up / login / profile)
- List items to exchange (with photos + what you want in return)
- Browse, search, and filter listings
- Listing detail pages
- User-to-user chat (Supabase Realtime)
- Follow users
- Report abuse (listing / user / message / conversation)
- Trust signals: **verified accounts** and **verified items**

## MVP scope (Phase 1 — this foundation)

- Monorepo (web + mobile skeleton + shared packages)
- Arabic-first, RTL by default; full English (LTR) support via `next-intl`
- GCC country/city support (SA, AE, QA, KW, BH, OM)
- Supabase schema, RLS, storage buckets, seed data
- Auth (email + password), profiles
- Listings: create, browse, filter, detail
- Chat (conversations + realtime messages)
- Follow + report
- Admin dashboard skeleton + management tables
- Verification: DB fields + manual admin flow + UI badges

## Explicitly NOT in Phase 1

Real payment, escrow, in-app monetary exchange, delivery/logistics, AI matching,
full verification automation, native store deployment, full notifications,
advanced analytics. The codebase is prepared for these (fields + `TODO`s).

## Country & region support

Primary region: **GCC**. Each country stores `name_ar`, `name_en`, ISO code,
phone code, **default currency** (for future premium pricing), timezone, and
active status. Cities are seeded per country. The model supports adding more
countries later (admin "Manage countries/cities" screens are scaffolded).

## Language & localization

- Arabic is the **default** and primary language; layout is **RTL**.
- English is fully supported (LTR).
- All UI strings live in `apps/web/messages/{ar,en}.json` — never hardcoded.
- Localizable data (categories, countries, cities) carries `name_ar`/`name_en`.
- User-generated content is shown as-authored (mixed languages allowed there).

## Platform responsibility

Swap clearly states it does **not** own, buy, sell, guarantee, or escrow
products, and does **not** guarantee product condition unless an item was
manually verified through the official **Verified Item** service. The final
agreement and handover are the users' responsibility. The disclaimer appears on
listing details, before starting an exchange chat, and on the Safety page.

## Monetization (future — no payment now)

Prepared in the schema, gated behind `TODO`s:

- **Verified Account** (paid badge + trust + search visibility)
- **Verified Item** (paid manual inspection by the Swap team)
- **Featured listings** (`listings.is_featured`)
- **Extra images** (free plan = 4; premium = 10–15)

Country `currency_code` exists so premium services can be priced per market.
