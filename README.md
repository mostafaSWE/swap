# Swap — بدّل ما لديك بما تحتاجه

> **Exchange what you have for what you need.**

Swap is a **barter marketplace** for the GCC. Users list items and exchange them
directly with each other. Swap does **not** handle money, selling, escrow, or
delivery — it only connects people and lets them agree on an exchange privately.

- 🟢 Arabic-first (RTL) · full English (LTR) support
- 🌍 GCC-ready (SA, AE, QA, KW, BH, OM) and extensible
- 📱 Mobile-first UI · web now, native apps later (shared code)
- 🛡️ Trust via verified accounts & verified items (manual in MVP)

## Tech stack

| Area | Tech |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| i18n | next-intl (`/ar`, `/en`, default `ar`) |
| Mobile | Expo (React Native) skeleton |
| Backend | Supabase — Auth, Postgres, Storage, Realtime |
| Forms | react-hook-form + zod |

## Folder structure

```
swap/
├─ apps/
│  ├─ web/        Next.js web app (App Router, RTL-first, i18n)
│  └─ mobile/     Expo React Native skeleton (shares packages)
├─ packages/
│  ├─ types/      Shared domain + DB TypeScript types
│  ├─ config/     Theme tokens, countries, cities, categories, constants
│  ├─ api/        Typed Supabase client + query functions (web + mobile)
│  └─ ui/         Cross-platform-safe helpers (formatting, localized names)
├─ supabase/
│  ├─ migrations/ 0001_schema · 0002_rls · 0003_storage
│  └─ seed.sql    GCC data + demo users/listings/chats/reports
├─ docs/          PRD · database-schema · setup-guide · roadmap
├─ .env.example
└─ turbo.json · pnpm-workspace.yaml
```

## Quick start

```bash
pnpm install
pnpm web          # http://localhost:3000  (renders with demo data out-of-the-box)
```

Then connect Supabase and seed (see **[docs/setup-guide.md](docs/setup-guide.md)**):

```bash
# apps/web/.env.local  ← from .env.example
# run supabase/migrations/* then supabase/seed.sql
```

Mobile skeleton:

```bash
pnpm mobile
```

## Environment variables

See [`.env.example`](.env.example). Put real values in `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never commit real secrets.

## Documentation

- [Product requirements](docs/product-requirements.md)
- [Database schema](docs/database-schema.md)
- [Setup guide](docs/setup-guide.md)
- [Roadmap](docs/roadmap.md)

## Roadmap (short)

- **Phase 1** (this repo): MVP foundation.
- **Phase 2**: better chat, notifications, ratings, verification workflow +
  payments, featured listings, premium features.
- **Phase 3**: native iOS/Android, AI matching, maps, video.

> **Disclaimer:** Swap does not own, buy, sell, guarantee, or escrow products,
> and does not guarantee product condition unless verified via the official
> verified-item service. The final agreement and handover are the users'
> responsibility.

## Repository

https://github.com/mostafaSWE/swap
