import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { authenticate, isAppLockEnabled } from "../lib/biometrics";
import { t } from "../i18n";
import { colors, spacing } from "../theme";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

/**
 * Optional biometric app-lock overlay (M5). When the user has enabled the lock AND
 * a Supabase session exists, it covers the app on launch and every return to the
 * foreground until a biometric / device-credential check succeeds. It is NOT a
 * replacement for auth — a signed-out app shows login, not this. The lock screen
 * always offers Sign out, so it never blocks logout/recovery/support access.
 *
 * NOTE: importing expo-local-authentication / expo-secure-store requires those
 * native modules — only present in an EAS build that includes them.
 */
export function BiometricLock({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false);
  const busy = useRef(false);

  const evaluate = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const enabled = await isAppLockEnabled();
    setLocked(Boolean(data.session) && enabled);
  }, []);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (await authenticate()) setLocked(false);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    void evaluate();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void evaluate();
    });
    return () => sub.remove();
  }, [evaluate]);

  // Prompt automatically as soon as the lock appears.
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
            <Button label={t("biometric.unlock")} onPress={unlock} fullWidth />
            <Button
              variant="ghost"
              label={t("mobile.profile.signOut")}
              onPress={() => {
                void supabase.auth.signOut();
                setLocked(false);
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
