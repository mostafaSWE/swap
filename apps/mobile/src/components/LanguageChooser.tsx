import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text } from "react-native";
import { Check } from "lucide-react-native";
import { changeLanguage } from "../lib/change-language";
import { locale, t, type Locale } from "../i18n";
import { colors, spacing } from "../theme";
import { BottomSheet } from "./ui/BottomSheet";
import { Icon } from "./ui/Icon";
import { LoadingScreen } from "./LoadingScreen";

/**
 * The in-app language chooser — a bottom sheet of the two languages plus the
 * "Switching language…" reload curtain. Reusable from ANYWHERE so the control is
 * reachable pre-login: Settings for signed-in users AND the home header, so a
 * brand-new signed-out user can switch language without needing an account.
 * Picking a language persists it, flips `I18nManager` direction, and reloads
 * (see `change-language`); a no-op when the current language is re-selected.
 */
export function LanguageChooser({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [switching, setSwitching] = useState(false);

  async function pick(next: Locale) {
    onClose();
    if (next === locale) return;
    setSwitching(true); // full-screen curtain until the reload tears down JS
    try {
      await changeLanguage(next);
    } catch {
      setSwitching(false); // reload failed to even start — let the user retry
    }
  }

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={t("settings.chooseLanguage")}>
        <Option label={t("common.english")} active={locale === "en"} onPress={() => pick("en")} />
        <Option label={t("common.arabic")} active={locale === "ar"} onPress={() => pick("ar")} />
      </BottomSheet>

      {/* Reload curtain — the SAME branded animated loader shown at app boot, so the
          language switch reads as a smooth branded transition, not a white flash. */}
      <Modal visible={switching} statusBarTranslucent animationType="fade">
        <LoadingScreen />
      </Modal>
    </>
  );
}

function Option({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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

const styles = StyleSheet.create({
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52, paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  optionPressed: { opacity: 0.6 },
  optionLabel: { color: colors.text, fontSize: 16, flex: 1 },
  optionActive: { color: colors.green, fontWeight: "700" },
});
