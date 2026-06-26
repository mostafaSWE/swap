import "reflect-metadata";
import helmet from "helmet";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

// CORS allowlist: explicit web origins only (no wildcard). `CORS_ORIGINS` is a
// comma-separated override; otherwise fall back to the public app URL / local dev.
// Use `||` (not `??`) so an empty/whitespace value falls through instead of
// producing an empty allowlist that would block every origin.
const corsAllowlist: (string | RegExp)[] = (
  process.env.CORS_ORIGINS?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// In development the Next.js dev server falls back to the next free port
// (e.g. :3001) whenever :3000 is already taken. The fixed allowlist would then
// reject the browser's CORS preflight for every authenticated POST — silently
// breaking message send / propose swap / create listing while RLS-backed reads
// (which hit Supabase directly, not this API) keep working. So in dev we accept
// any localhost origin regardless of port; production keeps the strict allowlist.
const corsOrigin: (string | RegExp)[] =
  process.env.NODE_ENV === "production"
    ? corsAllowlist
    : [...corsAllowlist, /^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: { origin: corsOrigin, credentials: true },
  });

  // Behind a reverse proxy, trust X-Forwarded-For so the rate limiter keys on the
  // real client IP rather than the single proxy IP. Opt-in via TRUST_PROXY (a hop
  // count like "1", "true", or a subnet) — left OFF by default because trusting
  // XFF from an untrusted network lets clients spoof their IP past rate limits.
  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (trustProxy) {
    app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === "true" ? true : trustProxy);
  }

  // Security headers. CSP is disabled here (the API serves JSON + the Swagger UI,
  // which needs inline scripts; the browser-facing CSP lives on the web app).
  // CORP is set to cross-origin so the web app can read API responses.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // Input validation is handled per-route by the shared zod schemas
  // (ZodBody pipe + @swap/validation), so no global class-validator pipe.
  // `/health` stays unprefixed for load balancers / uptime checks.
  app.setGlobalPrefix("api/v1", { exclude: ["health"] });

  const config = new DocumentBuilder()
    .setTitle("JustSwap API")
    .setDescription("Backend API for the JustSwap direct-exchange marketplace. Consumed by the web and mobile apps.")
    .setVersion("1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "supabase-jwt")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  // Cloud hosts (Render/Railway/Fly/etc.) inject the listen port via PORT; honor
  // it first, then the local API_PORT, then the dev default. Bind 0.0.0.0 so the
  // platform's router + health check can reach the container.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  new Logger("Bootstrap").log(`JustSwap API listening on port ${port} (prefix /api/v1, docs /api/docs)`);
}

void bootstrap();
