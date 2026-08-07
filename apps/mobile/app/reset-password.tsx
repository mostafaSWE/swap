import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { CircleCheckBig } from "lucide-react-native";
import { supabase } from "../src/lib/supabase";
import { t } from "../src/i18n";
import { colors, radii, spacing } from "../src/theme";
import { Button, FormAlert, Icon, PasswordInput, PasswordRequirements, StrengthMeter } from "../src/components/ui";

const passwordOk = (value: string) => value.length >= 8 && /[a-zA-Z]/.test(value) && /[0-9]/.test(value);
const STRENGTH = ["", "strengthWeak", "strengthFair", "strengthGood", "strengthStrong"] as const;
const pwScore = (v: string) => {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[a-zA-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (v.length >= 12 || /[^a-zA-Z0-9]/.test(v)) s++;
  return s;
};

/** Native recovery destination: callback verifies the recovery link first, then
 * this screen updates the password within the resulting Supabase session. */
export default function ResetPassword() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error: authError }) => setHasSession(data.user ? true : !authError ? false : true)).catch(() => setHasSession(true));
  }, []);

  async function submit() {
    if (busy) return;
    setError(null);
    if (!passwordOk(password)) return setError(t("auth.passwordWeak"));
    if (password !== confirm) return setError(t("auth.passwordMismatch"));
    setBusy(true);
    // try/catch/finally so a thrown updateUser can't leave the button spinning forever with the error swallowed.
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) setError(t("auth.resetError"));
      else {
        setDone(true);
        setTimeout(() => router.replace("/(tabs)/profile"), 1200);
      }
    } catch {
      setError(t("auth.resetError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t("auth.resetTitle") }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t("auth.resetTitle")}</Text>
          {done ? (
            <View style={styles.doneWrap}>
              <View style={styles.doneBadge}><Icon icon={CircleCheckBig} size={30} color={colors.green} /></View>
              <Text style={styles.done}>{t("auth.resetDone")}</Text>
            </View>
          ) : hasSession === false ? (
            <><Text style={styles.hint}>{t("auth.resetExpired")}</Text><Button label={t("auth.forgotTitle")} onPress={() => router.replace("/forgot-password")} fullWidth /></>
          ) : (
            <>
              <View>
                <PasswordInput label={t("auth.newPassword")} value={password} onChangeText={setPassword} textContentType="newPassword" autoComplete="new-password" returnKeyType="next" />
                {password ? (
                  <View style={styles.strength}>
                    <StrengthMeter score={pwScore(password)} label={pwScore(password) > 0 ? t(`auth.${STRENGTH[pwScore(password)]}`) : undefined} />
                    <PasswordRequirements value={password} />
                  </View>
                ) : null}
              </View>
              <PasswordInput label={t("auth.confirmPassword")} value={confirm} onChangeText={setConfirm} textContentType="newPassword" autoComplete="new-password" returnKeyType="go" onSubmitEditing={submit} />
              {error ? <FormAlert message={error} /> : null}
              <Button label={t("auth.resetSubmit")} onPress={submit} loading={busy} disabled={hasSession === null} fullWidth />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 26, fontWeight: "800" },
  hint: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  strength: { marginTop: 6, gap: spacing.xs },
  doneWrap: { alignItems: "center", gap: spacing.md },
  doneBadge: { width: 64, height: 64, borderRadius: radii.pill, backgroundColor: colors.greenLight, alignItems: "center", justifyContent: "center" },
  done: { color: colors.green, fontSize: 15, fontWeight: "700", textAlign: "center" },
});
