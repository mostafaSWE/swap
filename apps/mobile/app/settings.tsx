import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ban, ChevronRight, FileText, Fingerprint, Globe, LifeBuoy, Lock, ShieldAlert } from "lucide-react-native";
import { isAppLockEnabled, isBiometricAvailable, setAppLockEnabled } from "../src/lib/biometrics";
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
  const [langOpen, setLangOpen] = useState(false);

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
});
