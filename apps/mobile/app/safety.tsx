import { StyleSheet, Text } from "react-native";
import { Stack } from "expo-router";
import { t, tList } from "../src/i18n";
import { LegalDoc, type LegalSection } from "../src/components/LegalDoc";
import { SafetyDisclaimer } from "../src/components/SafetyDisclaimer";
import { colors } from "../src/theme";

/** The 7 platform-responsibility points, in web's order (excludes `meetPublic`,
 *  which is covered by the sections above). Single-sourced from `safety.points`. */
const POINTS = ["noOwn", "noBuy", "noSell", "noGuarantee", "noEscrow", "noCondition", "userResponsibility"] as const;

/**
 * Safety guide (web `/safety`). Renders the shared `safety.sections` catalog via
 * `LegalDoc`, then a platform-notice block (heading + the full-variant
 * `SafetyDisclaimer` listing the 7 responsibility points) — mirroring web's `extra`
 * slot. Reachable from Settings and Support.
 */
export default function SafetyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t("safety.title") }} />
      <LegalDoc
        eyebrow={t("safety.eyebrow")}
        title={t("safety.title")}
        subtitle={t("safety.subtitle")}
        updated={t("safety.updated")}
        sections={tList<LegalSection>("safety.sections")}
        extra={
          <>
            <Text style={styles.noticeTitle} accessibilityRole="header">{t("safety.noticeTitle")}</Text>
            <SafetyDisclaimer title={t("safety.disclaimerTitle")} points={POINTS.map((k) => t(`safety.points.${k}`))} />
          </>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  noticeTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
});
