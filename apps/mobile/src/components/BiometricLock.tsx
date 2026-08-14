import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Modal, StyleSheet, Text, View, type AppStateStatus } from "react-native";
import { Lock } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import {
  authenticate,
  isAppLockEnabledFor,
  isAppLockEnabledForSync,
  isBiometricPromptInFlight,
  isTrustedNativeFlowActive,
} from "../lib/biometrics";
import { signOutRespectingBiometric } from "../lib/sign-out";
import { t } from "../i18n";
import { colors, spacing } from "../theme";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

/**
 * Optional biometric app-lock overlay (M5). When the signed-in user has enabled the
 * lock, it covers the app on launch and on every return from the BACKGROUND until a
 * biometric / device-credential check succeeds. It is not authentication — a signed-out
 * app shows login — and it always offers Sign out, so it can never block logout.
 *
 * THIS WAS REPORTED AS GLITCHY ON A REAL DEVICE. What was actually wrong, and why the
 * code below looks the way it does:
 *
 * 1. It re-locked on ANY non-active state. Both platforms report `inactive` for things
 *    that are not the user leaving — and, critically, iOS reports it while presenting
 *    the biometric prompt itself. So a successful unlock was immediately followed by a
 *    re-lock and another prompt: an endless loop. Only `background` re-locks now.
 * 2. Android has no `inactive` at all (AppStateModule emits only active/background), so
 *    the image picker, share sheet and permission dialogs look identical to leaving.
 *    Those flows mark themselves via `beginTrustedNativeFlow()` and are ignored.
 * 3. The prompt itself is ignored globally via `isBiometricPromptInFlight()`, which is
 *    shared with Settings' enable flow so the two can't prompt over each other.
 * 4. The overlay renders in its own `Modal`. As a plain absolutely-positioned View it
 *    sat UNDER every RN Modal, so an open bottom sheet (propose swap, report, language,
 *    any Select) stayed visible and interactive behind the "lock" — and in the app
 *    switcher snapshot.
 * 5. The foreground re-check now unlocks as well as locks, so disabling the lock can
 *    never strand someone behind an overlay they just turned off.
 * 6. The opt-in is stored per user id, so a second account on the same device does not
 *    inherit the first one's lock, and an expiring session no longer silently wipes the
 *    preference.
 */
export function BiometricLock({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false);

  const uid = useRef<string | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  /** Bumped on every unlock so a slow in-flight check can't re-lock afterwards. */
  const generation = useRef(0);

  /** Synchronous "should the app be covered right now". */
  const armed = useCallback(() => isAppLockEnabledForSync(uid.current), []);

  const sync = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();
    uid.current = data.session?.user.id ?? null;
    return uid.current ? await isAppLockEnabledFor(uid.current) : false;
  }, []);

  const unlock = useCallback(async () => {
    if (isBiometricPromptInFlight()) return;
    if (await authenticate()) {
      generation.current += 1;
      setLocked(false);
    }
  }, []);

  useEffect(() => {
    const gen = generation.current;
    void sync().then((on) => {
      if (on && gen === generation.current) setLocked(true);
    });

    const sub = AppState.addEventListener("change", (next) => {
      const prev = appState.current;
      appState.current = next;

      // An in-app system UI (biometric prompt, photo picker, share sheet) — not the
      // user leaving. Ignored in BOTH directions so it neither locks nor re-checks.
      if (isBiometricPromptInFlight() || isTrustedNativeFlowActive()) return;

      if (next === "background") {
        // Synchronous — no await between "user left" and the cover going up.
        if (armed()) setLocked(true);
        return;
      }

      if (next === "active" && prev === "background") {
        const g = generation.current;
        void sync().then((on) => {
          if (g !== generation.current) return;
          // Both directions: `on` false must UNLOCK, or turning the lock off and
          // backgrounding would leave the overlay up with no way past it.
          setLocked(on);
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      uid.current = session?.user.id ?? null;
      if (event === "SIGNED_OUT") {
        // Keep the stored preference — it is keyed by user id, so it simply stops
        // applying. Clearing here would also fire on an expired refresh token and
        // silently discard a setting the user chose.
        generation.current += 1;
        setLocked(false);
      } else if (event === "SIGNED_IN") {
        void sync();
      }
    });

    return () => {
      sub.remove();
      subscription.unsubscribe();
    };
  }, [sync, armed]);

  // Prompt as soon as the cover appears. The shared in-flight flag stops this from
  // stacking a second system prompt.
  useEffect(() => {
    if (locked) void unlock();
  }, [locked, unlock]);

  return (
    <>
      {children}
      {/* A Modal, not a sibling View: RN Modals render in their own native window and
          would otherwise sit ON TOP of a plain overlay, leaking whatever sheet was open. */}
      <Modal visible={locked} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={styles.overlay}>
          <Icon icon={Lock} size={40} color={colors.green} />
          <Text style={styles.title}>{t("biometric.lockedTitle")}</Text>
          <View style={styles.actions}>
            <Button label={t("biometric.unlock")} onPress={() => void unlock()} fullWidth />
            <Button
              variant="ghost"
              label={t("mobile.profile.signOut")}
              onPress={() => {
                // Escape hatch — works even if biometry is broken or locked out.
                generation.current += 1;
                setLocked(false);
                void signOutRespectingBiometric();
              }}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.xl,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800", textAlign: "center" },
  actions: { alignSelf: "stretch", gap: spacing.sm },
});
