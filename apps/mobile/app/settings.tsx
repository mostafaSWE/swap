import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ban, Check, ChevronRight, FileText, Fingerprint, Globe, LifeBuoy, Lock, ShieldAlert } from "lucide-react-native";
import { isAppLockEnabled, isBiometricAvailable, setAppLockEnabled } from "../src/lib/biometrics";
import { changeLanguage } from "../src/lib/change-language";
import { locale, t, type Locale } from "../src/i18n";
import { colors, radii, spacing } from "../src/theme";
import { ListRow } from "../src/components/ui/ListRow";
import { BottomSheet } from "../src/components/ui/BottomSheet";
import { Icon } from "../src/components/ui/Icon";
import type { LucideIcon } from "lucide-react-native";

/** Account settings & safety — a discoverable, grouped hub: App preferences (the
 *  in-app Language control + app lock), Account & privacy, and Support & legal. */
export default function SettingsScreen() {
  const router = useRouter();
  const [biometricOk, setBiometricOk] = useState(false);
  const [appLockOn, setAppLockOn] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricOk).catch(() => undefined);
    isAppLockEnabled().then(setAppLockOn).catch(() => undefined);
  }, []);

  async function toggleAppLock(next: boolean) {
    if (lockBusy) return;
    setLockBusy(true);
    try {
      setAppLockOn(await setAppLockEnabled(next)); // enabling requires a successful biometric auth
    } finally {
      setLockBusy(false);
    }
  }

  async function pickLanguage(next: Locale) {
    setLangOpen(false);
    if (next === locale) return;
    setSwitching(true); // full-screen "Switching language…" until the reload tears down JS
    try {
      await changeLanguage(next);
    } catch {
      setSwitching(false); // reload failed to even start — let the user retry
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
              </>
            ) : null}
          </View>
        </View>

        {/* Account & privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("settings.account")}</Text>
          <View style={styles.group}>
            <Row icon={Ban} label={t("block.blockedTitle")} onPress={() => router.push("/blocked")} />
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

      {/* Language chooser */}
      <BottomSheet visible={langOpen} onClose={() => setLangOpen(false)} title={t("settings.chooseLanguage")}>
        <LanguageOption label={t("common.english")} active={locale === "en"} onPress={() => pickLanguage("en")} />
        <LanguageOption label={t("common.arabic")} active={locale === "ar"} onPress={() => pickLanguage("ar")} />
      </BottomSheet>

      {/* Reload curtain — shown while the app flips direction + reloads. */}
      {switching ? (
        <View style={styles.curtain} pointerEvents="auto">
          <ActivityIndicator color={colors.green} size="large" />
          <Text style={styles.curtainText}>{t("settings.switching")}</Text>
        </View>
      ) : null}
    </>
  );
}

function LanguageOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
    >
      <Text style={[styles.optionLabel, active && styles.optionActive]}>{label}</Text>
      {active ? <Icon icon={Check} size={18} color={colors.green} /> : null}
    </Pressable>
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
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52, paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  optionPressed: { opacity: 0.6 },
  optionLabel: { color: colors.text, fontSize: 16, flex: 1 },
  optionActive: { color: colors.green, fontWeight: "700" },
  curtain: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: spacing.md },
  curtainText: { color: colors.textMuted, fontSize: 15, fontWeight: "600" },
});
