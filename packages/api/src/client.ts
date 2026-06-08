import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** A Supabase client typed against the Swap database schema. */
export type SwapClient = SupabaseClient<Database>;

/**
 * Create a plain Supabase client. Suitable for the mobile app and for simple
 * browser usage.
 *
 * The Next.js web app uses `@supabase/ssr` instead (cookie-aware server/browser
 * clients) — see apps/web/src/lib/supabase. Both produce a `SwapClient`, so the
 * query functions in this package work with either.
 */
export function createSupabaseClient(url: string, anonKey: string): SwapClient {
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
