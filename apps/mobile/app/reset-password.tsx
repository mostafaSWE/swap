import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { t } from "../src/i18n";
import { colors, spacing } from "../src/theme";
import { Button, Input } from "../src/components/ui";

const passwordOk = (value: string) => value.length >= 8 && /[a-zA-Z]/.test(value) && /[0-9]/.test(value);

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
    setError(null);
    if (!passwordOk(password)) return setError(t("auth.passwordWeak"));
    if (password !== confirm) return setError(t("auth.passwordMismatch"));
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError(t("auth.resetError"));
    else {
      setDone(true);
      setTimeout(() => router.replace("/(tabs)/profile"), 1200);
    }
    setBusy(false);
  }

  return (
    <>
      <Stack.Screen options={{ title: t("auth.resetTitle") }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t("auth.resetTitle")}</Text>
          {done ? <Text style={styles.done}>{t("auth.resetDone")}</Text> : hasSession === false ? (
            <><Text style={styles.hint}>{t("auth.resetExpired")}</Text><Button label={t("auth.forgotTitle")} onPress={() => router.replace("/forgot-password")} fullWidth /></>
          ) : (
            <>
              <Input label={t("auth.newPassword")} value={password} onChangeText={setPassword} secureTextEntry />
              <Input label={t("auth.confirmPassword")} value={confirm} onChangeText={setConfirm} secureTextEntry onSubmitEditing={submit} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
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
  error: { color: colors.danger, fontSize: 13 },
  done: { color: colors.green, fontSize: 15, fontWeight: "700", textAlign: "center" },
});
