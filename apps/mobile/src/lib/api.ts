import { createApiClient, type SwapApiClient } from "@swap/api";
import { supabase } from "./supabase";

// Expo inlines EXPO_PUBLIC_* at build time; declare process for typing only.
declare const process: { env: Record<string, string | undefined> };

const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Shared REST client for the Swap backend (NestJS, /api/v1) — the SAME
 * SwapApiClient the web app uses, so all mutation/business logic stays in one
 * place. Auth is bearer-token: getToken() returns the live Supabase access
 * token, so every mutation is authenticated.
 */
export const api: SwapApiClient = createApiClient({
  baseUrl,
  getToken: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
});
