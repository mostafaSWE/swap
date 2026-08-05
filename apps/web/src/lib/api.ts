"use client";

import { createApiClient, type SwapApiClient } from "@swap/api";
import { createClient } from "./supabase/client";
import { isTermsNotAccepted, requestTermsAcceptance } from "./terms-gate";

/** True when the backend API base URL is configured. */
export function isApiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL);
}

let cached: SwapApiClient | null = null;

/**
 * Wrap the API client so any write rejected with 403 `terms_not_accepted`
 * (TermsGuard — Apple 1.2) pops the `<TermsGate>` EULA modal and, on acceptance,
 * retries the SAME request once. Safe: the guard rejects BEFORE the route handler
 * runs, so the failed request had no side effect. Transparent to every caller —
 * no per-form wiring. `acceptTerms` is never intercepted (it's the accept path).
 */
function withTermsGate(client: SwapApiClient): SwapApiClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function" || prop === "acceptTerms") return value;
      const method = value as (...args: unknown[]) => unknown;
      return (...args: unknown[]) => {
        const run = () => method.apply(target, args);
        const result = run();
        if (!(result instanceof Promise)) return result;
        return result.catch(async (err: unknown) => {
          if (isTermsNotAccepted(err) && (await requestTermsAcceptance())) return run();
          throw err;
        });
      };
    },
  });
}

/**
 * Browser-side JustSwap backend API client. Sends the current Supabase access token
 * as a bearer so the NestJS backend can authenticate the user.
 *
 * Returns null when NEXT_PUBLIC_API_URL is not set, so callers can fall back to
 * direct Supabase (keeps the app runnable without the backend in dev).
 */
export function getApi(): SwapApiClient | null {
  if (!isApiConfigured()) return null;
  if (cached) return cached;
  const supabase = createClient();
  cached = withTermsGate(
    createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL!,
      getToken: async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        return session?.access_token ?? null;
      },
    }),
  );
  return cached;
}
