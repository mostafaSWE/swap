import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { t } from "../i18n";

/**
 * Device-biometric features. Two distinct things live here, deliberately kept apart:
 *
 *  • APP LOCK — a local convenience lock ON TOP of an existing Supabase session. It is
 *    not authentication; a signed-out app shows login, not the lock.
 *  • BIOMETRIC SIGN-IN — re-establishing a session after sign-out, by unsealing a
 *    refresh token from the device keychain behind a biometric check.
 *
 * Neither ever stores the user's password.
 *
 * Both opt-ins are stored PER USER ID. A single app-wide key meant the next account to
 * sign in on a shared device inherited the previous user's lock, and one person's
 * biometric could be used to restore another person's session.
 */

const LOCK_KEY = "justswap_app_lock_uid"; // value = the uid the lock belongs to
const BIO_SESSION_PREFIX = "justswap_bio_session_"; // + uid → refresh token

/* ────────────────────────────── availability ────────────────────────────── */

/** True only if the device has biometric hardware AND an enrolled biometric. */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

/* ─────────────────── trusted native flows (Android lifecycle) ─────────────────── */

/**
 * Android's AppStateModule emits ONLY `active`/`background` — there is no `inactive`.
 * So the image picker, the share sheet and permission dialogs all pause the Activity
 * and look exactly like the user leaving the app. Without this, returning from picking
 * a listing photo greeted you with a biometric prompt.
 *
 * Wrap those known in-app flows so the lock ignores the excursion. Depth-counted
 * because flows can nest (pick a photo from inside an edit sheet).
 */
let trustedFlowDepth = 0;
export function beginTrustedNativeFlow(): void {
  trustedFlowDepth += 1;
}
export function endTrustedNativeFlow(): void {
  trustedFlowDepth = Math.max(0, trustedFlowDepth - 1);
}
export function isTrustedNativeFlowActive(): boolean {
  return trustedFlowDepth > 0;
}

/** Set while a system biometric prompt is on screen, from ANY caller (Settings' enable
 *  flow as well as the lock overlay) so the two can never prompt over each other. */
let promptInFlight = false;
export function isBiometricPromptInFlight(): boolean {
  return promptInFlight;
}

async function prompt(message: string): Promise<LocalAuthentication.LocalAuthenticationResult> {
  promptInFlight = true;
  try {
    return await LocalAuthentication.authenticateAsync({
      promptMessage: message,
      // Device credential (PIN/pattern/passcode) stays available: biometry can be
      // temporarily locked out after failed attempts, and we must never make the app
      // unopenable — or an account unreachable — because of that.
      disableDeviceFallback: false,
    });
  } finally {
    promptInFlight = false;
  }
}

/* ────────────────────────────── app lock ────────────────────────────── */

/** Cached opt-in owner, so the lock can decide SYNCHRONOUSLY at background time —
 *  SecureStore is async, and awaiting it there leaves a window where the OS snapshots
 *  real content into the app switcher. */
let cachedLockUid: string | null = null;

/** Synchronous: is the lock on for this user? Meaningful after one async read. */
export function isAppLockEnabledForSync(uid: string | null): boolean {
  return Boolean(uid) && cachedLockUid === uid;
}

export async function isAppLockEnabledFor(uid: string | null): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(LOCK_KEY).catch(() => null);
  cachedLockUid = stored;
  return Boolean(uid) && stored === uid;
}

/** Turn the lock OFF. Always succeeds — never trap a user behind a lock they want gone. */
export async function disableAppLock(): Promise<void> {
  cachedLockUid = null; // synchronously, before the await
  await SecureStore.deleteItemAsync(LOCK_KEY).catch(() => undefined);
}

/**
 * Why enabling failed — so Settings can say something useful instead of silently
 * snapping the switch back.
 */
export type BiometricResult = "ok" | "unavailable" | "cancelled" | "failed";

function classify(res: LocalAuthentication.LocalAuthenticationResult): BiometricResult {
  if (res.success) return "ok";
  switch (res.error) {
    case "user_cancel":
    case "system_cancel":
    case "app_cancel":
      return "cancelled";
    case "not_available":
    case "not_enrolled":
    case "passcode_not_set":
      // Can happen even after isBiometricAvailable() passed — the user may have removed
      // their enrolment between the check and the prompt.
      return "unavailable";
    default:
      return "failed";
  }
}

/**
 * Turn the lock ON for `uid`. Requires one successful biometric / device-credential
 * check so the user proves the device secret works BEFORE we start gating the app.
 */
export async function enableAppLockFor(uid: string): Promise<BiometricResult> {
  if (!(await isBiometricAvailable())) return "unavailable";
  try {
    const verdict = classify(await prompt(t("biometric.enablePrompt")));
    if (verdict !== "ok") return verdict;
    await SecureStore.setItemAsync(LOCK_KEY, uid).catch(() => undefined);
    cachedLockUid = uid;
    return "ok";
  } catch {
    return "failed";
  }
}

/** Prompt to unlock the app. Device-credential fallback allowed (avoids lockouts). */
export async function authenticate(): Promise<boolean> {
  try {
    return (await prompt(t("biometric.unlockPrompt"))).success;
  } catch {
    return false;
  }
}

/* ──────────────────────── biometric sign-in ──────────────────────── */

/**
 * Seal a refresh token in the device keychain for `uid`, so the account can be restored
 * after sign-out behind a biometric check. The password is NEVER stored.
 *
 * Trade-off, deliberate and disclosed in the UI: to make this work, sign-out for an
 * account with biometric sign-in enabled must be LOCAL (`scope: "local"`), because a
 * global sign-out revokes the refresh token server-side and the sealed copy would be
 * useless. That is why enabling is explicit and per-account, and why "Forget this
 * device" performs a full global sign-out.
 */
export async function enableBiometricSignIn(
  uid: string,
  refreshToken: string,
): Promise<BiometricResult> {
  if (!(await isBiometricAvailable())) return "unavailable";
  try {
    const verdict = classify(await prompt(t("biometric.enableSignInPrompt")));
    if (verdict !== "ok") return verdict;
    await SecureStore.setItemAsync(BIO_SESSION_PREFIX + uid, refreshToken);
    return "ok";
  } catch {
    return "failed";
  }
}

/** Update the sealed token (refresh tokens rotate) without re-prompting. */
export async function refreshSealedToken(uid: string, refreshToken: string): Promise<void> {
  const existing = await SecureStore.getItemAsync(BIO_SESSION_PREFIX + uid).catch(() => null);
  if (!existing) return; // not enrolled — never create it silently
  await SecureStore.setItemAsync(BIO_SESSION_PREFIX + uid, refreshToken).catch(() => undefined);
}

export async function hasBiometricSignIn(uid: string): Promise<boolean> {
  return Boolean(await SecureStore.getItemAsync(BIO_SESSION_PREFIX + uid).catch(() => null));
}

export async function disableBiometricSignIn(uid: string): Promise<void> {
  await SecureStore.deleteItemAsync(BIO_SESSION_PREFIX + uid).catch(() => undefined);
}

/**
 * Unseal the refresh token for `uid` behind a biometric check. Returns the token only
 * after a successful prompt — the caller hands it to `supabase.auth.setSession`.
 */
export async function unsealSessionFor(
  uid: string,
): Promise<{ result: BiometricResult; refreshToken?: string }> {
  const token = await SecureStore.getItemAsync(BIO_SESSION_PREFIX + uid).catch(() => null);
  if (!token) return { result: "unavailable" };
  if (!(await isBiometricAvailable())) return { result: "unavailable" };
  try {
    const verdict = classify(await prompt(t("biometric.signInPrompt")));
    if (verdict !== "ok") return { result: verdict };
    return { result: "ok", refreshToken: token };
  } catch {
    return { result: "failed" };
  }
}
