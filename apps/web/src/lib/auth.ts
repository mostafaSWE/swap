import { redirect } from "@/i18n/navigation";
import type { Locale, Profile } from "@swap/types";
import { getProfileById } from "@swap/api";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./env";

/** Returns the current auth user (or null). Null when Supabase is unconfigured. */
export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Returns the current user's full profile (or null if signed out / unconfigured). */
export async function getCurrentProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getProfileById(supabase, user.id);
}

/**
 * Guard for protected pages. Redirects to /login if signed out.
 * Pass the page's locale so the redirect keeps the language prefix.
 */
export async function requireUser(locale: Locale) {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });
  return user!;
}

/** Guard for admin pages. Redirects home if not an admin. */
export async function requireAdmin(locale: Locale): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect({ href: "/login", locale });
  if (!profile!.is_admin) redirect({ href: "/", locale });
  return profile!;
}
