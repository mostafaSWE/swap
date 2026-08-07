import { Stack } from "expo-router";
import { t, tList } from "../src/i18n";
import { LegalDoc, type LegalSection } from "../src/components/LegalDoc";

/**
 * Terms of Service viewer (web `/terms`). Renders the SAME shared `terms.sections`
 * catalog the web uses via the shared `LegalDoc` — the legal copy is single-sourced,
 * never re-authored on mobile. Linked from Support, Settings, the register consent
 * line, and the terms-acceptance gate ("Read the full Terms").
 */
export default function TermsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t("terms.title") }} />
      <LegalDoc
        eyebrow={t("terms.eyebrow")}
        title={t("terms.title")}
        subtitle={t("terms.subtitle")}
        updated={t("terms.updated")}
        sections={tList<LegalSection>("terms.sections")}
      />
    </>
  );
}
