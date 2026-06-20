"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@swap/api";
import type { SwapClient } from "@swap/api";

/** Browser Supabase client (Client Components). Typed against the JustSwap schema. */
export function createClient(): SwapClient {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
