import * as Linking from "expo-linking";

/**
 * One canonical callback for signup confirmation, resend, and password recovery.
 * The Supabase dashboard must allow this app scheme (documented in the release
 * plan) so mail links return to the installed native client rather than web.
 */
export function authCallbackUrl(next: "/onboarding" | "/reset-password") {
  return Linking.createURL("/auth/callback", { queryParams: { next } });
}
