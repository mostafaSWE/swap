import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** A Supabase client typed against the Swap database schema. */
export type SwapClient = SupabaseClient<Database>;

/** The session-storage adapter shape Supabase accepts (AsyncStorage satisfies it). */
type SupabaseStorage = NonNullable<SupabaseClientOptions<"public">["auth"]>["storage"];

/**
 * Options for {@link createSupabaseClient}. All optional; the defaults suit a
 * simple browser client. Native (React Native / Expo) callers pass a `storage`
 * adapter (AsyncStorage) so the auth session survives app restarts, and set
 * `detectSessionInUrl: false` (there is no browser URL to read a session from).
 */
export interface CreateSupabaseClientOptions {
  /**
   * Session-persistence adapter. On native, pass AsyncStorage. Defaults to the
   * platform default: localStorage on web, and **in-memory on native** — which
   * loses the session on every cold start, so native MUST supply this.
   */
  storage?: SupabaseStorage;
  /**
   * Parse a session from the page URL after OAuth / magic-link redirects.
   * Leave the default (true) on web; pass `false` on native.
   */
  detectSessionInUrl?: boolean;
  /** Auto-refresh the access token before it expires. Default true. */
  autoRefreshToken?: boolean;
  /** Persist the session via `storage`. Default true. */
  persistSession?: boolean;
}

/**
 * Create a plain Supabase client. Suitable for the mobile app and for simple
 * browser usage.
 *
 * The Next.js web app uses `@supabase/ssr` instead (cookie-aware server/browser
 * clients) — see apps/web/src/lib/supabase. Both produce a `SwapClient`, so the
 * query functions in this package work with either.
 *
 * The third `opts` argument is additive and backwards-compatible: existing
 * two-arg callers are unchanged. Native callers pass
 * `{ storage: AsyncStorage, detectSessionInUrl: false }`.
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  opts: CreateSupabaseClientOptions = {},
): SwapClient {
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: opts.persistSession ?? true,
      autoRefreshToken: opts.autoRefreshToken ?? true,
      ...(opts.storage ? { storage: opts.storage } : {}),
      ...(opts.detectSessionInUrl !== undefined
        ? { detectSessionInUrl: opts.detectSessionInUrl }
        : {}),
    },
  });
}
