# JustSwap — بدّل ما لديك بما تحتاجه

> **Exchange what you have for what you need.**

JustSwap is a **barter marketplace** for the GCC. Users list items and exchange them
directly with each other. JustSwap does **not** handle money, selling, escrow, or
delivery — it only connects people and lets them agree on an exchange privately.

- 🟢 Arabic-first (RTL) · full English (LTR) support
- 🌍 GCC-ready (SA, AE, QA, KW, BH, OM) and extensible
- 📱 Mobile-first UI · web now, native apps later (shared code)
- 🛡️ Trust via each user's **completed-swaps count** + ratings (no identity verification)

## Tech stack

| Area | Tech |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| i18n | next-intl (`/ar`, `/en`, default `ar`) |
| Mobile | Expo (React Native) skeleton |
| **Backend API** | **NestJS** (`/api/v1`) — business-logic layer for web + mobile, Swagger docs at `/api/docs` |
| Platform | Supabase — Auth, Postgres, Storage, Realtime, RLS |
| Validation | zod (shared `@swap/validation`, used by API DTOs + forms) |
| Forms | react-hook-form + zod |

### Architecture: backend API vs Supabase

- **NestJS API (`apps/api`)** owns business logic and sensitive writes — create/update
  listing, image-upload signing + free-limit enforcement, swap proposals, start
  conversation, send message, follow, report, and **all admin actions** (with an
  `admin_actions` audit log). It authenticates the Supabase JWT (bearer) and uses the
  service-role key with app-level authorization.
- **Supabase** still handles Auth sessions, Postgres + RLS (protects any direct
  browser reads), Storage, and Realtime (chat transport).
- The shared **`@swap/api`** client (used by web **and** mobile) calls the backend for
  mutations. If `NEXT_PUBLIC_API_URL` is unset, it falls back to direct Supabase so the
  app still runs in local dev without the backend.

## Folder structure

```
swap/
├─ apps/
│  ├─ web/        Next.js web app (App Router, RTL-first, i18n)
│  ├─ api/        NestJS backend API (/api/v1, Swagger at /api/docs)
│  └─ mobile/     Expo React Native skeleton (shares packages)
├─ packages/
│  ├─ types/      Shared domain + DB TypeScript types
│  ├─ config/     Theme tokens, countries, cities, categories, safety text
│  ├─ validation/ Shared zod schemas (API DTOs + frontend forms)
│  ├─ api/        Supabase client + queries AND the typed REST client (web + mobile)
│  └─ ui/         Cross-platform-safe helpers (formatting, localized names)
├─ supabase/
│  ├─ migrations/ 0001_schema · 0002_rls · 0003_storage · 0004_catalog_expansion
│  └─ seed.sql    GCC data + demo users/listings/chats/reports
├─ docs/          PRD · database-schema · setup-guide · roadmap
├─ .env.example
└─ turbo.json · pnpm-workspace.yaml
```

## Quick start

```bash
pnpm install
pnpm web          # http://localhost:3000  (renders with demo data out-of-the-box)
pnpm api          # http://localhost:4000/api/v1  (Swagger: /api/docs)
pnpm mobile       # Expo dev server
```

Then connect Supabase and seed (see **[docs/setup-guide.md](docs/setup-guide.md)**):

```bash
# .env (root, used by API) and apps/web/.env.local  ← from .env.example
# run supabase/migrations/0001..0004 then supabase/seed.sql
```

### Database-first

The app reads and writes **real data from Supabase/Postgres** — there is no
hidden mock data. `supabase/seed.sql` populates **12 demo users** (1 admin,
across the GCC), **44 listings** (with images, varied status/featured), follows,
saved listings, 8 conversations + messages, and reports. A small built-in demo
dataset renders the read pages only when `NEXT_PUBLIC_USE_DEMO_DATA=true` (local
dev without a DB) — never as a silent fallback.

**Demo accounts** (development only — password `Swap1234!`):
`ahmed@swap.demo` (admin), `sara@swap.demo`, `khalid@swap.demo`,
… `noura/yousef/mariam/salem/huda/tariq/layla@swap.demo`. **Never use these in production.**

## Environment variables

See [`.env.example`](.env.example). Put real values in `apps/web/.env.local`:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1   # empty = direct-Supabase fallback
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server/API only — never expose to the client
API_PORT=4000
```

Never commit real secrets.

## Documentation

- [Product requirements](docs/product-requirements.md)
- [Database schema](docs/database-schema.md)
- [Setup guide](docs/setup-guide.md)
- [Roadmap](docs/roadmap.md)

## Roadmap (short)

- **Phase 1** (this repo): MVP foundation.
- **Phase 2**: better chat, notifications, ratings, featured listings, premium features.
- **Phase 3**: native iOS/Android, AI matching, maps, video.

> **Disclaimer:** JustSwap does not own, buy, sell, guarantee, or escrow products,
> does not verify user identity, and does not guarantee the condition of any
> listed product. The final agreement and handover are the users' responsibility.

## Repository

https://github.com/mostafaSWE/swap
