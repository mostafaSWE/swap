# ─────────────────────────────────────────────────────────────
# JustSwap backend API (NestJS) — a long-running server.
#
# The app runs raw TypeScript via ts-node, so the ENTIRE pnpm workspace
# (apps/api + the @swap/* packages) must be present and installed at runtime,
# including devDependencies (ts-node / tsconfig-paths / typescript).
#
# Build context = repo root. Works as-is on Render, Railway, and Fly.io.
# ─────────────────────────────────────────────────────────────
FROM node:22-slim

# pnpm via corepack, pinned to the repo's packageManager version.
RUN corepack enable && corepack prepare pnpm@11.2.2 --activate

WORKDIR /app

# Copy the whole monorepo (node_modules/build artifacts excluded via
# .dockerignore) and install every workspace dep — devDeps included, because
# `start` (ts-node) needs them.
COPY . .
RUN pnpm install --frozen-lockfile

# Strict-CORS branch + production logging are gated on NODE_ENV=production, so
# CORS_ORIGINS (or NEXT_PUBLIC_APP_URL) MUST list the deployed web origin or the
# browser's API calls will be blocked.
ENV NODE_ENV=production

# Documentation only — the host injects the real port via $PORT, which main.ts
# reads. Health probe target: GET /health (unauthenticated, unprefixed).
EXPOSE 4000

CMD ["pnpm", "--filter", "@swap/api-server", "start"]
