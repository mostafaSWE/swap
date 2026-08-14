import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, StyleSheet, Text, View, type AppStateStatus } from "react-native";
import { Lock } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { authenticate, clearAppLock, isAppLockEnabled } from "../lib/biometrics";
import { t } from "../i18n";
import { colors, spacing } from "../theme";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

/**
 * Optional biometric app-lock overlay (M5). When the user has enabled the lock AND a
 * Supabase session exists, it covers the app on launch and on every return from the
 * BACKGROUND until a biometric / device-credential check succeeds. It is not
 * authentication — a signed-out app shows login, not this — and it always offers Sign
 * out so it can never block logout/recovery/support.
 *
 * WHY THIS IS WRITTEN CAREFULLY (it was reported as glitchy on a real device):
 *
 * 1. Only `background` re-locks — never `inactive`. Both platforms fire `inactive` for
 *    things that are NOT the user leaving: the iOS app-switcher preview, the
 *    notification shade, an incoming call banner and, critically, **presenting the
 *    biometric prompt itself**. The previous version locked on any non-active state,
 *    so a successful unlock was immediately followed by a re-lock and a second prompt —
 *    an endless unlock→relock loop, exactly the reported symptom.
 * 2. AppState transitions are ignored while an auth prompt is in flight, and for a
 *    short grace period after it resolves, because some Android OEMs really do
 *    background the app behind BiometricPrompt.
 * 3. The "should we lock" inputs are cached in a ref, so backgrounding locks
 *    synchronously — no async gap in which content could be captured or shown.
 * 4. A generation counter stops a slow in-flight check from re-locking the app after
 *    the user has already unlocked (the old code could `setLocked(true)` after a
 *    successful `setLocked(false)`).
 * 5. Sign-out clears the stored flag: the key is app-wide in the device keychain, so
 *    otherwise the next account to sign in on that device inherits the lock.
 *
 * NOTE: importing expo-local-authentication / expo-secure-store requires those native
 * modules — only present in a build that includes them.
 */
export function BiometricLock({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false);

  /** Cached "a session exists AND the lock is on" — read synchronously when backgrounding. */
  const armed = useRef(false);
  /** True from the moment we ask for biometrics until shortly after the prompt closes. */
  const authing = useRef(false);
  const lastAuthAt = useRef(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  /** Bumped on every unlock so a stale arm-check can't re-lock afterwards. */
  const generation = useRef(0);

  const refreshArmed = useCallback(async (): Promise<boolean> => {
    const [{ data }, enabled] = await Promise.all([supabase.auth.getSession(), isAppLockEnabled()]);
    armed.current = Boolean(data.session) && enabled;
    return armed.current;
  }, []);

  const unlock = useCallback(async () => {
    if (authing.current) return;
    authing.current = true;
    try {
      if (await authenticate()) {
        generation.current += 1; // invalidate any arm-check racing behind us
        setLocked(false);
      }
    } finally {
      lastAuthAt.current = Date.now();
      authing.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial arm check. If the lock is on we cover the app straight away.
    const gen = generation.current;
    void refreshArmed().then((on) => {
      if (on && gen === generation.current) setLocked(true);
    });

    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;

      // The biometric prompt churns AppState on both platforms — ignore it, and give
      // the dismissal a moment to settle before we trust transitions again.
      if (authing.current || Date.now() - lastAuthAt.current < 1000) return;

      if (next === "background") {
        // Synchronous: no await between "user left" and the overlay going up.
        if (armed.current) setLocked(true);
        return;
      }

      // Only a real background→foreground return re-locks. `inactive`→`active`
      // (control centre, app switcher, permission dialog) must NOT.
      if (next === "active" && prev === "background") {
        const g = generation.current;
        void refreshArmed().then((on) => {
          if (on && g === generation.current) setLocked(true);
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        armed.current = false;
        generation.current += 1;
        setLocked(false);
        void clearAppLock();
      } else if (event === "SIGNED_IN") {
        void refreshArmed();
      }
    });

    return () => {
      sub.remove();
      subscription.unsubscribe();
    };
  }, [refreshArmed]);

  // Prompt as soon as the overlay appears. Guarded by `authing`, so a re-render or a
  // second lock event cannot stack two system prompts.
  useEffect(() => {
    if (locked) void unlock();
  }, [locked, unlock]);

  return (
    <>
      {children}
      {locked ? (
        <View style={styles.overlay}>
          <Icon icon={Lock} size={40} color={colors.green} />
          <Text style={styles.title}>{t("biometric.lockedTitle")}</Text>
          <View style={styles.actions}>
            <Button label={t("biometric.unlock")} onPress={() => void unlock()} fullWidth />
            <Button
              variant="ghost"
              label={t("mobile.profile.signOut")}
              onPress={() => {
                // Escape hatch: works even if biometry is broken or locked out.
                generation.current += 1;
                armed.current = false;
                setLocked(false);
                void supabase.auth.signOut();
              }}
              fullWidth
            />
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.xl,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800", textAlign: "center" },
  actions: { alignSelf: "stretch", gap: spacing.sm },
});
