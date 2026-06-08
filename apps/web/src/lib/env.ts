/** True when Supabase env vars are present (auth/data require this). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Development-only demo mode. The app is **database-first**: real data is used
 * whenever the DB is reachable. Demo data is ONLY returned when this flag is
 * explicitly enabled (`NEXT_PUBLIC_USE_DEMO_DATA=true`) — it is never a silent
 * fallback for query errors, so a broken query shows an empty state, not fake
 * data masquerading as real.
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true";
}
