import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { t } from "../i18n";

/**
 * Optional biometric APP LOCK (M5). This is a local convenience lock ON TOP of the
 * existing Supabase session — it is NOT authentication and never stores the
 * password. Enabling requires one successful biometric/device-credential check;
 * the opt-in flag lives in the OS keychain/keystore (SecureStore). Device-credential
 * fallback stays enabled so a biometric lockout never traps the user, and the lock
 * screen always offers Sign out.
 */
const LOCK_KEY = "justswap_app_lock";

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

/**
 * Last known value of the opt-in, kept in module scope so the lock overlay can decide
 * to cover the app SYNCHRONOUSLY the moment it is backgrounded — SecureStore is async,
 * and awaiting it there would leave a window in which the OS snapshots real content
 * into the app switcher. Every read/write below keeps this in step, so it cannot go
 * stale when the user flips the toggle in Settings.
 */
let cachedEnabled = false;

/** Synchronous view of the opt-in. Only meaningful after one async read has happened. */
export function isAppLockEnabledSync(): boolean {
  return cachedEnabled;
}

export async function isAppLockEnabled(): Promise<boolean> {
  const enabled = (await SecureStore.getItemAsync(LOCK_KEY).catch(() => null)) === "1";
  cachedEnabled = enabled;
  return enabled;
}

/**
 * Clear the opt-in. Called on sign-out: the flag lives in the device keychain under a
 * single app-wide key, so without this the NEXT person to sign in on the same device
 * inherits the previous user's lock — and is prompted for a biometric that protects an
 * account that is no longer signed in.
 */
export async function clearAppLock(): Promise<void> {
  cachedEnabled = false; // synchronously, before the await
  await SecureStore.deleteItemAsync(LOCK_KEY).catch(() => undefined);
}

/**
 * Why enabling failed — so Settings can say something useful instead of silently
 * snapping the switch back.
 *   unavailable = no hardware, or nothing enrolled
 *   cancelled   = the user dismissed the prompt
 *   failed      = biometry rejected / lockout / unexpected error
 */
export type AppLockEnableResult = "enabled" | "unavailable" | "cancelled" | "failed";

/** Turn the lock OFF. Always succeeds — never trap a user behind a lock they want gone. */
export async function disableAppLock(): Promise<void> {
  await clearAppLock();
}

/**
 * Turn the lock ON. Requires one successful biometric / device-credential check so the
 * user proves the device secret works BEFORE we start gating the app with it.
 * Returns why it failed so Settings can explain.
 */
export async function enableAppLock(): Promise<AppLockEnableResult> {
  if (!(await isBiometricAvailable())) return "unavailable";
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: t("biometric.enablePrompt"),
      // Device credential (PIN/pattern/passcode) stays available: biometry can be
      // temporarily locked out after failed attempts, and we must never make the app
      // unopenable because of that.
      disableDeviceFallback: false,
    });
    if (!res.success) {
      const err = (res as { error?: string }).error;
      return err === "user_cancel" || err === "system_cancel" || err === "app_cancel"
        ? "cancelled"
        : "failed";
    }
    await SecureStore.setItemAsync(LOCK_KEY, "1").catch(() => undefined);
    cachedEnabled = true;
    return "enabled";
  } catch {
    return "failed";
  }
}

/** Prompt to unlock. Device-credential fallback is allowed (avoids lockouts). */
export async function authenticate(): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: t("biometric.unlockPrompt"),
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}
