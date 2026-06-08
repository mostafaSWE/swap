# Swap — Setup Guide

## Prerequisites

- **Node.js ≥ 20**
- **pnpm ≥ 9** (`npm i -g pnpm`)
- A **Supabase** project (free tier is fine) — optional for first run
- For mobile: the **Expo Go** app, or an iOS/Android simulator

## 1. Install dependencies

From the repo root:

```bash
pnpm install
```

This installs all workspaces (`apps/*`, `packages/*`).

## 2. Run the web app (works even without Supabase)

```bash
pnpm web
# → http://localhost:3000  (redirects to /ar)
```

Before Supabase is configured, the web app renders with a **built-in demo
dataset** so you can see the UI immediately. Real data kicks in once you add env
vars and seed the database.

## 3. Configure Supabase + env files

1. Create a project at https://supabase.com.
2. Copy `.env.example` to **two** places:
   - **`.env`** (repo root) — read by the NestJS API and scripts.
   - **`apps/web/.env.local`** — read by the web app.

   Fill in (from **Project Settings → API**):

   ```
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1   # leave empty to skip the backend
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service role key>        # server/API only
   API_PORT=4000
   ```

## 4. Run migrations + seed

**Option A — Supabase SQL editor (simplest):** open the SQL editor and run, in
order, the contents of:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_storage.sql`
4. `supabase/migrations/0004_catalog_expansion.sql`  (parent/child categories + expanded GCC cities)
5. `supabase/seed.sql`

**Option B — Supabase CLI:**

```bash
# link once
supabase link --project-ref <ref>

# push each migration file (or use `supabase db push` with a migrations dir)
supabase db execute -f supabase/migrations/0001_schema.sql
supabase db execute -f supabase/migrations/0002_rls.sql
supabase db execute -f supabase/migrations/0003_storage.sql
supabase db execute -f supabase/seed.sql
```

The seed is **idempotent** (safe to re-run). It creates 5 demo users — all with
password **`Swap1234!`** (e.g. `ahmed@swap.demo` is an admin + verified).

> Generating fresh types after schema changes:
> `supabase gen types typescript --project-id <ref> > packages/api/src/database.types.ts`

## 5. Storage

Buckets (`avatars`, `listing-images`, `chat-images`) and their policies are
created by `0003_storage.sql`. No manual dashboard steps needed.

## 6. Run the backend API (NestJS)

```bash
pnpm api          # http://localhost:4000/api/v1
# Interactive Swagger/OpenAPI docs: http://localhost:4000/api/docs
```

The API reads `.env` at the repo root (Supabase URL + **service-role** key). It
authenticates requests via the `Authorization: Bearer <supabase access token>`
header. With `NEXT_PUBLIC_API_URL` set, the web app routes mutations through it;
leave it empty to use direct Supabase instead.

> Production note: `pnpm --filter @swap/api-server build` type-checks the API.
> Dev/start run via `ts-node` (no dist build). Bundling for production deploy is
> a Phase-2 devops task (e.g. `nest build` with the shared packages prebuilt, or
> a `tsup`/`esbuild` bundle).

## 7. Run the mobile skeleton

```bash
pnpm mobile      # then press i / a, or scan the QR with Expo Go
```

Mobile credentials (optional) come from `EXPO_PUBLIC_SUPABASE_URL` /
`EXPO_PUBLIC_SUPABASE_ANON_KEY` or `app.json → expo.extra`.

## Useful root scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run all apps via Turborepo |
| `pnpm web` | Web app only |
| `pnpm mobile` | Expo dev server |
| `pnpm build` | Build all |
| `pnpm typecheck` | Type-check every workspace |

## Troubleshooting

- **Web shows demo data / "login" everywhere** → env vars not loaded. Ensure
  `apps/web/.env.local` exists and restart `pnpm web`.
- **Auth works but listings are empty** → run `seed.sql`.
- **Metro can't resolve `@swap/*`** → re-run `pnpm install` (symlinks) and clear
  cache: `pnpm --filter @swap/mobile start -- -c`.
