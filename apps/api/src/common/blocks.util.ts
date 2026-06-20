import { ForbiddenException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Block check for the service-role (RLS-bypassing) mutation paths. The listings
 * feed enforces blocks via RLS, but messaging/proposals run through the admin
 * client, so they must check explicitly here (spec §3.8).
 *
 * Bidirectional: returns true if EITHER user has blocked the other — blocking
 * severs messaging both ways. Callers must pass trusted ids (resolved from the
 * JWT), never raw request input.
 */
export async function usersBlockEachOther(
  db: SupabaseClient,
  a: string,
  b: string,
): Promise<boolean> {
  const { data, error } = await db
    .from("blocks")
    .select("blocker_id")
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`)
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Throw 403 if either user has blocked the other. */
export async function assertNotBlocked(db: SupabaseClient, a: string, b: string): Promise<void> {
  if (await usersBlockEachOther(db, a, b)) {
    throw new ForbiddenException("You cannot interact with this user");
  }
}
