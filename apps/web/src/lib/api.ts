"use client";

import { createApiClient, type SwapApiClient } from "@swap/api";
import { createClient } from "./supabase/client";

/** True when the backend API base URL is configured. */
export function isApiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL);
}

let cached: SwapApiClient | null = null;

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
  cached = createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL!,
    getToken: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    },
  });
  return cached;
}
