import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { t } from "../src/i18n";
import { colors, spacing } from "../src/theme";
import { Button, Input } from "../src/components/ui";

/** Email/username + password sign-in (web `LoginForm`). A username is resolved to
 *  its account email via the `email_for_username` RPC first. On success the
 *  persisted session updates every auth-reactive screen (e.g. the Profile tab). */
export default function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      let email = identifier.trim();
      if (!email.includes("@")) {
        const { data, error: lookupErr } = await supabase.rpc("email_for_username", { uname: email });
        if (lookupErr || !data) {
          setError(t("auth.errorInvalid"));
          return;
        }
        email = data as string;
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        // Supabase returns a stable code for an unverified account — surface that
        // (email confirmation is ON) instead of a misleading "wrong credentials".
        const code = (signInErr as { code?: string }).code;
        setError(code === "email_not_confirmed" ? t("auth.errorEmailUnconfirmed") : t("auth.errorInvalid"));
        return;
      }
      // Session set → onAuthStateChange updates the app. Return to where we came from.
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/profile");
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t("auth.loginTitle") }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t("auth.loginTitle")}</Text>
          <Text style={styles.subtitle}>{t("auth.loginSubtitle")}</Text>

          <Input
            label={t("auth.emailOrUsername")}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />
          <Input
            label={t("auth.password")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label={t("auth.loginButton")} onPress={submit} loading={busy} fullWidth />

          <View style={styles.footer}>
            <Text style={styles.muted}>{t("auth.noAccount")} </Text>
            <Text style={styles.link} onPress={() => router.push("/register")}>{t("auth.createOne")}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1, justifyContent: "center" },
  title: { color: colors.text, fontSize: 26, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.sm },
  error: { color: colors.danger, fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.md, flexWrap: "wrap" },
  muted: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.green, fontSize: 14, fontWeight: "700" },
});
