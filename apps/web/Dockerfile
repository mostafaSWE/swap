# ─────────────────────────────────────────────────────────────
# JustSwap web (Next.js 14, App Router).
#
# Transpiles the @swap/* workspace packages from source, so the WHOLE pnpm
# workspace must be present and installed (devDeps included). Build context =
# repo root. On Railway: set this service's Dockerfile path to apps/web/Dockerfile.
#
# IMPORTANT: NEXT_PUBLIC_* values are inlined into the client bundle at BUILD
# time, not read at runtime. They are declared as build ARGs below; Railway
# passes matching service variables in as build args automatically. Changing any
# NEXT_PUBLIC_* value therefore requires a REBUILD (redeploy), not just a restart.
# ─────────────────────────────────────────────────────────────
FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@11.2.2 --activate

WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

# Public env needed at build time (inlined into the bundle).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_USE_DEMO_DATA
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_USE_DEMO_DATA=$NEXT_PUBLIC_USE_DEMO_DATA \
    NODE_ENV=production

RUN pnpm --filter @swap/web build

# next start honors $PORT (Railway injects it); falls back to 3000 locally.
EXPOSE 3000
CMD ["pnpm", "--filter", "@swap/web", "start"]
