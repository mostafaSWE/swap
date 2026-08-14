import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * "Remember me" — remembers WHO signed in, never a password.
 *
 * WHY IT IS NOT PASSWORDLESS
 * Supabase's `signOut()` revokes the refresh token server-side, so after a real sign-out
 * there is no credential left to replay. The only way to restore a session without
 * re-typing anything is the sealed-refresh-token path in `biometrics.ts`, which is gated
 * behind a device biometric and is offered as a SEPARATE, clearly-labelled option.
 *
 * So this deliberately does the honest thing: it stores the identifier the user signed
 * in with (email or username — exactly what they typed) so the Sign In screen can
 * prefill it and they only supply their password. No token, no password, nothing secret,
 * which is why AsyncStorage is the right home rather than the keychain.
 *
 * The user controls it: unticking the box on the Sign In screen clears it immediately.
 */
const KEY = "justswap_remembered_identifier";

export async function getRememberedIdentifier(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function setRememberedIdentifier(identifier: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, identifier.trim());
  } catch {
    // Non-fatal: a convenience feature must never block signing in.
  }
}

export async function clearRememberedIdentifier(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/* ─────────────── which account may be restored biometrically ─────────────── */

/**
 * Pointer to the account that has a sealed session in the keychain, so the Sign In
 * screen knows whether to offer the biometric button and whose session to restore.
 *
 * Only a user id and a display label — the token itself lives in SecureStore under a
 * per-user key (see biometrics.ts). Keeping the pointer separate is what stops one
 * person's fingerprint from restoring another person's account: the unseal is by uid,
 * and enrolling a second account overwrites this pointer while leaving the first
 * account's token untouched but unreachable from this screen.
 */
const BIO_ACCOUNT_KEY = "justswap_bio_account";

export type BiometricAccount = { uid: string; label: string };

export async function getBiometricSignInAccount(): Promise<BiometricAccount | null> {
  try {
    const raw = await AsyncStorage.getItem(BIO_ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BiometricAccount;
    return parsed?.uid ? parsed : null;
  } catch {
    return null;
  }
}

export async function setBiometricSignInAccount(account: BiometricAccount): Promise<void> {
  try {
    await AsyncStorage.setItem(BIO_ACCOUNT_KEY, JSON.stringify(account));
  } catch {
    // ignore
  }
}

export async function clearBiometricSignInAccount(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BIO_ACCOUNT_KEY);
  } catch {
    // ignore
  }
}
