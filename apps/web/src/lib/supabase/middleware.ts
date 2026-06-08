import { createServerClient } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";
import type { Database } from "@swap/api";

/**
 * Refresh the Supabase auth session and sync cookies onto the response that
 * next-intl already produced. Returns the (mutated) response.
 *
 * If Supabase env vars are missing (e.g. before .env.local is filled in), this
 * is a no-op so the app still renders.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the session so expired tokens are refreshed.
  await supabase.auth.getUser();
  return response;
}
