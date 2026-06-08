import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database, SwapClient } from "@swap/api";

/**
 * Server Supabase client (Server Components, Route Handlers, Server Actions).
 * Reads/writes the auth cookies via next/headers.
 */
export function createClient(): SwapClient {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookie writes are ignored here.
            // Session refresh happens in middleware instead.
          }
        },
      },
    },
  );
}
