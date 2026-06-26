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
 * Guard for protected pages. Redirects to /login if signed out, or if the
 * account has been banned / is actively suspended (mirrors the backend
 * AuthGuard, so moderation is reflected in the web too — not just the API).
 * Fails OPEN on a profile-read error so a transient blip never locks out a
 * legitimate user. Pass the page's locale so the redirect keeps the prefix.
 *
 * NOTE: this gates every protected/account page. Public read surfaces still
 * render via RLS until the session expires — full read-level lockout (RLS /
 * middleware) is deferred to Phase 6.
 */
export async function requireUser(locale: Locale) {
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_banned,is_suspended,suspended_until")
    .eq("id", user!.id)
    .maybeSingle();
  if (profile) {
    const activelySuspended =
      profile.is_suspended && (!profile.suspended_until || new Date(profile.suspended_until) > new Date());
    if (profile.is_banned || activelySuspended) {
      redirect({ href: "/login", locale });
    }
  }
  return user!;
}

/** Guard for admin pages. Redirects to admin login if not an admin. */
export async function requireAdmin(locale: Locale): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect({ href: "/admin/login", locale });
  if (!profile!.is_admin) redirect({ href: "/admin/login", locale });
  return profile!;
}
