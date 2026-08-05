import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import { TERMS_VERSION } from "@swap/config";
import { supabase } from "./supabase";
import { api } from "./api";
import { t } from "../i18n";
import { colors, spacing } from "../theme";
import { BottomSheet } from "../components/ui/BottomSheet";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";

/**
 * Terms/EULA acceptance gate (Apple Guideline 1.2 — accept the zero-tolerance
 * agreement BEFORE posting). `ensureAccepted()` is called at every UGC write
 * site; if the signed-in user has not accepted the CURRENT `TERMS_VERSION`, it
 * presents a blocking acceptance sheet and resolves `true` only once they accept
 * (server-stamped via POST /me/terms). It hard-BLOCKS the write otherwise — a
 * dismissible warning would not satisfy Apple 1.2. The backend enforces the same
 * rule (TermsGuard + listings/messages RLS), so this is the UX layer of a
 * defence-in-depth gate, not the only line.
 */
type TermsContextValue = { ensureAccepted: () => Promise<boolean>; refresh: () => void };
const TermsContext = createContext<TermsContextValue>({
  ensureAccepted: async () => true,
  refresh: () => undefined,
});

export function TermsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // undefined = unknown/not-loaded · true = must (re)accept · false = up to date
  const [needsTerms, setNeedsTerms] = useState<boolean | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const resolver = useRef<((accepted: boolean) => void) | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setNeedsTerms(undefined);
      return;
    }
    // Read the accepted version straight from the user's own profile row (RLS
    // allows reading own). Fail OPEN on error (e.g. the 0018 column not migrated
    // yet) so the app is never bricked; the backend still enforces on write.
    const { data: profile, error: readError } = await supabase
      .from("profiles")
      .select("terms_accepted_version")
      .eq("id", data.user.id)
      .maybeSingle();
    if (readError) {
      setNeedsTerms(false);
      return;
    }
    const accepted = (profile?.terms_accepted_version as number | null) ?? 0;
    setNeedsTerms(accepted < TERMS_VERSION);
  }, []);

  useEffect(() => {
    void load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => void load());
    return () => subscription.unsubscribe();
  }, [load]);

  const ensureAccepted = useCallback(async (): Promise<boolean> => {
    if (needsTerms === false) return true;
    // Re-check once in case the cached state is stale (undefined / just signed in).
    await load();
    setError(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setVisible(true);
    });
  }, [needsTerms, load]);

  function settle(accepted: boolean) {
    setVisible(false);
    const r = resolver.current;
    resolver.current = null;
    r?.(accepted);
  }

  async function accept() {
    setBusy(true);
    setError(false);
    try {
      await api.acceptTerms();
      setNeedsTerms(false);
      settle(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <TermsContext.Provider value={{ ensureAccepted, refresh: () => void load() }}>
      {children}
      <BottomSheet visible={visible} onClose={() => settle(false)} title={t("termsGate.title")}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Icon icon={ShieldCheck} size={26} color={colors.green} />
          </View>
          <Text style={styles.lead}>{t("termsGate.body")}</Text>
          <Text style={styles.zero}>{t("termsGate.zeroTolerance")}</Text>
          <Button
            variant="ghost"
            label={t("termsGate.viewTerms")}
            onPress={() => {
              settle(false);
              router.push("/terms");
            }}
            fullWidth
          />
          {error ? <Text style={styles.error}>{t("termsGate.error")}</Text> : null}
          <Button label={t("termsGate.accept")} onPress={accept} loading={busy} fullWidth />
          <Button variant="secondary" label={t("termsGate.decline")} onPress={() => settle(false)} fullWidth />
        </ScrollView>
      </BottomSheet>
    </TermsContext.Provider>
  );
}

export const useTerms = () => useContext(TermsContext);

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingBottom: spacing.md },
  iconWrap: { alignSelf: "center", width: 52, height: 52, borderRadius: 26, backgroundColor: colors.greenLight, alignItems: "center", justifyContent: "center" },
  lead: { color: colors.text, fontSize: 15, lineHeight: 22, textAlign: "center" },
  zero: { color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  error: { color: colors.danger, fontSize: 13, textAlign: "center" },
});
