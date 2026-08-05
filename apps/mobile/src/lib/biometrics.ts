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

export async function isAppLockEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(LOCK_KEY).catch(() => null)) === "1";
}

/** Enable requires a successful auth; disable clears the flag. Returns the new state. */
export async function setAppLockEnabled(enable: boolean): Promise<boolean> {
  if (!enable) {
    await SecureStore.deleteItemAsync(LOCK_KEY).catch(() => undefined);
    return false;
  }
  if (!(await isBiometricAvailable())) return false;
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: t("biometric.enablePrompt"),
    disableDeviceFallback: false,
  });
  if (!res.success) return false;
  await SecureStore.setItemAsync(LOCK_KEY, "1").catch(() => undefined);
  return true;
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
