import { Stack } from "expo-router";
import { t, tList } from "../src/i18n";
import { LegalDoc, type LegalSection } from "../src/components/LegalDoc";

/**
 * Privacy Policy viewer (web `/privacy`). Renders the shared `privacy.sections`
 * catalog via `LegalDoc` — single-sourced copy, never re-authored on mobile.
 * Reachable from Settings, Support, and the register consent line.
 */
export default function PrivacyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t("privacy.title") }} />
      <LegalDoc
        eyebrow={t("privacy.eyebrow")}
        title={t("privacy.title")}
        subtitle={t("privacy.subtitle")}
        updated={t("privacy.updated")}
        sections={tList<LegalSection>("privacy.sections")}
      />
    </>
  );
}
