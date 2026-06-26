# JustSwap

> Exchange what you have for what you need.

JustSwap is an Arabic-first barter marketplace for the GCC. People list items,
message each other, propose direct exchanges, and arrange handover themselves.
The platform is not a shop: it does not buy, sell, escrow, ship, or guarantee
items.

## What Is Included

- Arabic RTL and English LTR web experience with locale routes at `/ar` and `/en`.
- Mobile-first Next.js app with responsive desktop chrome, dark/light themes, and
  localized legal, safety, and support pages.
- Listings with categories, country/city filtering, saved listings, featured
  flags, image upload, edit/pause/remove flows, and view tracking.
- Swap workflow: proposals, multiple offered items, counter-offers, chat,
  completion confirmation with proof photo, ratings, and notifications.
- Trust and safety: reports, user blocking, auto-hide threshold for reported
  listings, safety notices, and admin moderation.
- Admin panel for users, listings, reports, catalog data, audit logs, and
  moderator messaging.
- Expo mobile skeleton that shares domain packages and API clients.

## Tech Stack

| Area | Tech |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 14 App Router, React 18, TypeScript, Tailwind CSS |
| i18n | next-intl (`/ar`, `/en`, default Arabic) |
| Backend API | NestJS under `apps/api`, mounted at `/api/v1`, Swagger at `/api/docs` |
| Mobile | Expo Router / React Native skeleton |
| Platform | Supabase Auth, Postgres, Storage, Realtime, RLS |
| Shared validation | Zod schemas in `@swap/validation` |
| Shared clients | Supabase queries + typed REST client in `@swap/api` |
| Shared config | Theme tokens, catalog data, countries/cities, safety text in `@swap/config` |

## Architecture

The app is database-first. Supabase stores the source of truth and enforces RLS.
The NestJS API owns sensitive mutations and business logic:

- listing create/update and signed image upload registration
- swap proposals, conversations, messages, follow/report actions
- admin actions and audit logging
- catalog admin writes for countries, cities, and categories

The API authenticates Supabase JWT bearer tokens and uses the Supabase service
role key server-side. Browser reads still use RLS-protected Supabase queries.
When `NEXT_PUBLIC_API_URL` is empty, the web app can fall back to direct Supabase
for local development, but connected environments should use the API.

## Repository Layout

```text
swap/
├─ apps/
│  ├─ web/        Next.js web app
│  ├─ api/        NestJS API server
│  └─ mobile/     Expo mobile skeleton
├─ packages/
│  ├─ api/        Supabase queries and typed REST client
│  ├─ config/     shared theme, catalog, country/city config
│  ├─ types/      shared domain and database types
│  ├─ ui/         formatting and localization helpers
│  └─ validation/ shared Zod schemas
├─ supabase/
│  ├─ migrations/ database, RLS, storage, proposals, ratings, notifications,
│  │              blocks, auto-hide, and admin moderation
│  ├─ functions/  Supabase Edge Functions, including send-email
│  ├─ seed.sql    demo GCC data
│  └─ full_setup.sql
├─ docs/
│  ├─ product-requirements.md
│  ├─ database-schema.md
│  ├─ setup-guide.md
│  └─ roadmap.md
├─ .env.example
├─ pnpm-workspace.yaml
└─ turbo.json
```

Current migrations:

```text
0001_schema.sql
0002_rls.sql
0003_storage.sql
0004_catalog_expansion.sql
0005_proposals.sql
0006_deal_closing.sql
0007_ratings.sql
0008_notifications.sql
0009_blocks_autohide.sql
0010_admin_moderation.sql
```

## Quick Start

Requirements:

- Node.js 22.13+ (CI uses Node 24)
- pnpm 11.2.2+
- Supabase project or local Supabase stack
- Expo Go or a simulator if working on `apps/mobile`

Install dependencies:

```bash
pnpm install
```

Create environment files from `.env.example`:

```bash
# root .env: API and shared server-side settings
# apps/web/.env.local: web public settings
```

Run the apps:

```bash
pnpm web     # Next.js web app at http://localhost:3000
pnpm api     # NestJS API at http://localhost:4000/api/v1
pnpm mobile  # Expo dev server
```

API docs are available at:

```text
http://localhost:4000/api/docs
```

## Environment Variables

See [`.env.example`](.env.example) for the full list. The core values are:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_USE_DEMO_DATA=false

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

API_PORT=4000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
TRUST_PROXY=
DATABASE_URL=

REPORT_AUTO_HIDE_THRESHOLD=5
```

Mobile can mirror the public values with:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Email for auth confirmation and password reset is handled by the
`supabase/functions/send-email` Edge Function. Configure its Resend and hook
secrets as Supabase function secrets, not as browser-exposed app variables.

Never commit real secrets.

## Database And Demo Data

Apply all migrations in order or use `supabase/full_setup.sql` for a full local
reset. Then run `supabase/seed.sql`.

The seed includes:

- 12 demo users across the GCC
- 1 admin profile
- 44 listings with images and varied statuses
- follows, saved listings, conversations, messages, reports, and admin actions

Development demo accounts use password `Swap1234!`:

```text
ahmed@swap.demo   admin
sara@swap.demo
khalid@swap.demo
noura@swap.demo
yousef@swap.demo
mariam@swap.demo
salem@swap.demo
huda@swap.demo
tariq@swap.demo
layla@swap.demo
```

Use these accounts only in development.

`NEXT_PUBLIC_USE_DEMO_DATA=true` enables a small built-in read-only fallback for
local UI work without a database. Keep it false or unset for connected
environments.

## Scripts

Root scripts:

| Command | Description |
| --- | --- |
| `pnpm dev` | Run all workspace dev tasks through Turborepo |
| `pnpm web` | Run `@swap/web` on port 3000 |
| `pnpm api` | Run `@swap/api-server` on port 4000 |
| `pnpm mobile` | Run the Expo dev server |
| `pnpm typecheck` | Typecheck workspaces through Turborepo |
| `pnpm lint` | Run configured lint tasks |
| `pnpm build` | Run configured build tasks |
| `pnpm clean` | Run workspace clean tasks and remove root `node_modules` |

Focused checks used most often:

```bash
pnpm --filter @swap/web typecheck
pnpm --filter @swap/web lint
pnpm --filter @swap/api-server typecheck
pnpm --filter @swap/mobile typecheck
```

## Documentation

- [Product requirements](docs/product-requirements.md)
- [Database schema](docs/database-schema.md)
- [Setup guide](docs/setup-guide.md)
- [Roadmap](docs/roadmap.md)

## Production Notes

- Route all sensitive mutations through the NestJS API.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Configure exact `CORS_ORIGINS`; do not reflect arbitrary browser origins.
- Set `TRUST_PROXY` only when the API is behind a trusted reverse proxy.
- Keep `NEXT_PUBLIC_USE_DEMO_DATA` false in real environments.
- Configure Supabase Auth redirect URLs for the deployed app URL.
- Do not add payments or escrow flows unless the product scope changes.

## Repository

https://github.com/mostafaSWE/swap
