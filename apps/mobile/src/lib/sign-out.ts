import { supabase } from "./supabase";
import { hasBiometricSignIn } from "./biometrics";

/**
 * Sign out, respecting biometric sign-in.
 *
 * Supabase's default sign-out is GLOBAL: it revokes the refresh token server-side. That
 * is the right default — but it would also destroy the token this device sealed in the
 * keychain for biometric sign-in, so the user's fingerprint would stop working the first
 * time they signed out, which is exactly when they need it.
 *
 * So when the account has biometric sign-in enrolled ON THIS DEVICE, we sign out
 * LOCALLY: the session is dropped from AsyncStorage and every screen becomes signed-out,
 * while the sealed refresh token stays valid for the biometric path. The trade-off is
 * deliberate and bounded — the token is only reachable behind a device biometric, is
 * scoped to one account, and "Forget this device" (turning the setting off) removes it.
 *
 * With no enrolment, this is an ordinary global sign-out.
 */
export async function signOutRespectingBiometric(): Promise<void> {
  let keepSealed = false;
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (uid) keepSealed = await hasBiometricSignIn(uid);
  } catch {
    // If we cannot tell, fall through to a full sign-out — the safer default.
  }
  await supabase.auth.signOut(keepSealed ? { scope: "local" } : undefined);
}
