import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { Ban, ChevronRight, FileText, Fingerprint, Globe, LifeBuoy, Lock, ShieldAlert, Trash2 } from "lucide-react-native";
import {
  disableAppLock,
  disableBiometricSignIn,
  enableAppLockFor,
  enableBiometricSignIn,
  hasBiometricSignIn,
  isAppLockEnabledFor,
  isBiometricAvailable,
} from "../src/lib/biometrics";
import { supabase } from "../src/lib/supabase";
import { clearBiometricSignInAccount, setBiometricSignInAccount } from "../src/lib/remember-me";
import { locale, t } from "../src/i18n";
import { colors, radii, spacing } from "../src/theme";
import { ListRow } from "../src/components/ui/ListRow";
import { LanguageChooser } from "../src/components/LanguageChooser";
import { Icon } from "../src/components/ui/Icon";
import type { LucideIcon } from "lucide-react-native";

/** Account settings & safety — a discoverable, grouped hub: App preferences (the
 *  in-app Language control + app lock), Account & privacy, and Support & legal. */
export default function SettingsScreen() {
  const router = useRouter();
  const [biometricOk, setBiometricOk] = useState(false);
  const [appLockOn, setAppLockOn] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [bioSignInOn, setBioSignInOn] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // Re-checked on focus, not just on mount: the user may have enrolled a fingerprint
  // in OS settings while this screen was still in the back stack.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const [available, { data }] = await Promise.all([
          isBiometricAvailable().catch(() => false),
          supabase.auth.getSession(),
        ]);
        const id = data.session?.user.id ?? null;
        if (!active) return;
        setBiometricOk(available);
        setUid(id);
        if (id) {
          setAppLockOn(await isAppLockEnabledFor(id).catch(() => false));
          setBioSignInOn(await hasBiometricSignIn(id).catch(() => false));
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  async function toggleAppLock(next: boolean) {
    if (lockBusy || !uid) return;
    setLockBusy(true);
    try {
      if (!next) {
        await disableAppLock(); // turning it OFF must always succeed
        setAppLockOn(false);
        return;
      }
      const result = await enableAppLockFor(uid);
      setAppLockOn(result === "ok");
      // Silence here was the old behaviour: the switch just snapped back with no
      // explanation. Cancelling is a deliberate user action, so stay quiet for that
      // one; anything else gets a reason.
      if (result === "unavailable") Alert.alert(t("biometric.settingLabel"), t("biometric.unavailable"));
      else if (result === "failed") Alert.alert(t("biometric.settingLabel"), t("biometric.enableFailed"));
    } finally {
      setLockBusy(false);
    }
  }

  /**
   * Biometric sign-in seals the CURRENT session's refresh token in the device keychain
   * so this account can be restored after sign-out with a fingerprint / Face ID instead
   * of a password. The password itself is never stored.
   */
  async function toggleBioSignIn(next: boolean) {
    if (bioBusy || !uid) return;
    setBioBusy(true);
    try {
      if (!next) {
        await disableBiometricSignIn(uid);
        await clearBiometricSignInAccount();
        setBioSignInOn(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.refresh_token;
      if (!token) {
        Alert.alert(t("biometric.signInLabel"), t("biometric.enableFailed"));
        return;
      }
      const result = await enableBiometricSignIn(uid, token);
      setBioSignInOn(result === "ok");
      if (result === "ok") {
        // Pointer the Sign In screen reads to know whose session it may restore.
        const u = data.session?.user;
        await setBiometricSignInAccount({
          uid,
          label: (u?.user_metadata?.username as string) || u?.email || "",
        });
      }
      if (result === "unavailable") Alert.alert(t("biometric.signInLabel"), t("biometric.unavailable"));
      else if (result === "failed") Alert.alert(t("biometric.signInLabel"), t("biometric.enableFailed"));
    } finally {
      setBioBusy(false);
    }
  }

  const currentLanguage = locale === "ar" ? t("common.arabic") : t("common.english");

  return (
    <>
      <Stack.Screen options={{ title: t("nav.settings") }} />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        {/* App preferences — the in-app Language control lives here, top of the hub. */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("settings.prefs")}</Text>
          <View style={styles.group}>
            <ListRow
              leading={<IconTile icon={Globe} />}
              title={t("common.language")}
              subtitle={currentLanguage}
              trailing={<Icon icon={ChevronRight} size={18} color={colors.textFaint} mirror />}
              onPress={() => setLangOpen(true)}
            />
            {biometricOk ? (
              <>
                <Divider />
                <ListRow
                  leading={<IconTile icon={Fingerprint} />}
                  title={t("biometric.settingLabel")}
                  subtitle={appLockOn ? t("biometric.on") : t("biometric.off")}
                  trailing={
                    <Switch
                      value={appLockOn}
                      onValueChange={toggleAppLock}
                      disabled={lockBusy}
                      trackColor={{ true: colors.green, false: colors.border }}
                      thumbColor={colors.white}
                    />
                  }
                />
                <Divider />
                {/* Distinct from App Lock: this one re-establishes a SESSION after
                    sign-out, rather than covering an existing one. */}
                <ListRow
                  leading={<IconTile icon={Fingerprint} />}
                  title={t("biometric.signInLabel")}
                  subtitle={bioSignInOn ? t("biometric.signInOn") : t("biometric.signInOff")}
                  trailing={
                    <Switch
                      value={bioSignInOn}
                      onValueChange={toggleBioSignIn}
                      disabled={bioBusy}
                      trackColor={{ true: colors.green, false: colors.border }}
                      thumbColor={colors.white}
                    />
                  }
                />
              </>
            ) : null}
          </View>
        </View>

        {/* Account & privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("settings.account")}</Text>
          <View style={styles.group}>
            <Row icon={Ban} label={t("block.blockedTitle")} onPress={() => router.push("/blocked")} />
            <Divider />
            {/* Irreversible — styled destructive so it never reads as an ordinary setting. */}
            <DangerRow icon={Trash2} label={t("deleteAccount.title")} onPress={() => router.push("/delete-account")} />
          </View>
        </View>

        {/* Support & legal */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("settings.support")}</Text>
          <View style={styles.group}>
            <Row icon={LifeBuoy} label={t("support.title")} onPress={() => router.push("/support")} />
            <Divider />
            <Row icon={FileText} label={t("terms.title")} onPress={() => router.push("/terms")} />
            <Divider />
            <Row icon={Lock} label={t("privacy.title")} onPress={() => router.push("/privacy")} />
            <Divider />
            <Row icon={ShieldAlert} label={t("safety.title")} onPress={() => router.push("/safety")} />
          </View>
        </View>
      </ScrollView>

      {/* Shared in-app language chooser (bottom sheet + reload curtain). */}
      <LanguageChooser visible={langOpen} onClose={() => setLangOpen(false)} />
    </>
  );
}

function Row({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <ListRow
      leading={<IconTile icon={icon} />}
      title={label}
      trailing={<Icon icon={ChevronRight} size={18} color={colors.textFaint} mirror />}
      onPress={onPress}
    />
  );
}

/** Destructive variant of `Row` — same metrics as `ListRow`, danger-tinted tile and
 *  label. Row is `flexDirection:"row"`, so it flips under RTL like every other row. */
function DangerRow({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.dangerRow, pressed && styles.pressed]}
    >
      <View style={styles.dangerTile}>
        <Icon icon={icon} size={18} color={colors.danger} />
      </View>
      <Text style={styles.dangerLabel} numberOfLines={1}>{label}</Text>
      <Icon icon={ChevronRight} size={18} color={colors.danger} mirror />
    </Pressable>
  );
}

function IconTile({ icon }: { icon: LucideIcon }) {
  return (
    <View style={styles.tile}>
      <Icon icon={icon} size={18} color={colors.green} />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing["3xl"] },
  section: { gap: spacing.sm },
  sectionLabel: { color: colors.textFaint, fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginStart: spacing.xs },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  divider: { height: 1, backgroundColor: colors.border, marginStart: 52 },
  tile: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: colors.greenLight, alignItems: "center", justifyContent: "center" },
  dangerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, minHeight: 52 },
  pressed: { opacity: 0.6 },
  dangerTile: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: "rgba(239,68,68,0.12)", alignItems: "center", justifyContent: "center" },
  dangerLabel: { flex: 1, color: colors.danger, fontSize: 15, fontWeight: "600" },
});
