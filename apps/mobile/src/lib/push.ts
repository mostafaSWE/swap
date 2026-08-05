import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { api } from "./api";

/**
 * Push registration (M5). The in-app notification center is the source of truth;
 * push is an additional channel. We register the Expo push token per install after
 * login and revoke it on logout. Permission denial is non-fatal — in-app
 * notifications keep working. Real delivery needs FCM (Android) / APNs (iOS)
 * credentials wired into the EAS project + the backend PUSH_WORKER_ENABLED flag.
 */
const INSTALL_KEY = "justswap_installation_id";

/** A stable per-install id (kept in the OS keychain/keystore via SecureStore). */
export async function getInstallationId(): Promise<string> {
  let id = await SecureStore.getItemAsync(INSTALL_KEY).catch(() => null);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    await SecureStore.setItemAsync(INSTALL_KEY, id).catch(() => undefined);
  }
  return id;
}

/** Show a banner for foreground pushes (no sound/badge by default). */
export function configurePushHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Ask for permission (only here, when the user is signed in), get the Expo push
 * token, and register it with the backend. Returns false if unavailable/denied —
 * the caller treats that as a soft state, not an error.
 */
export async function registerForPush(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return false;

    // Android needs a notification channel for headed-up delivery.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const installationId = await getInstallationId();

    await api.registerDevice({
      installation_id: installationId,
      token: tokenData.data,
      provider: "expo",
      platform: Platform.OS === "ios" ? "ios" : "android",
      app_env: __DEV__ ? "development" : "production",
    });
    return true;
  } catch {
    // Simulator (no push service), network, or missing creds — non-fatal.
    return false;
  }
}

/** Detach this install's token on logout (best-effort). */
export async function revokePush(): Promise<void> {
  try {
    const id = await SecureStore.getItemAsync(INSTALL_KEY).catch(() => null);
    if (id) await api.revokeDevice(id);
  } catch {
    /* best-effort */
  }
}

/**
 * Resolve a push payload's navigation target. Only identifiers travel in the
 * payload; the destination screen re-checks authorization (e.g. chat is RLS-gated),
 * so a stale/unauthorized deep-link surfaces nothing sensitive.
 */
export function pushTarget(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  if (typeof data.conversation_id === "string") return `/messages/${data.conversation_id}`;
  if (typeof data.type === "string" && data.type.startsWith("proposal")) return "/(tabs)/notifications";
  return "/(tabs)/notifications";
}
