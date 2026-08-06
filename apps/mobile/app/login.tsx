import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { authCallbackUrl } from "../src/lib/auth-redirect";
import { t } from "../src/i18n";
import { colors, spacing } from "../src/theme";
import { Button, FormAlert, Input, PasswordInput } from "../src/components/ui";

/** Email/username + password sign-in (web `LoginForm`). A username is resolved to
 *  its account email via the `email_for_username` RPC first. On success the
 *  persisted session updates every auth-reactive screen (e.g. the Profile tab). */
export default function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState<string | null>(null);
  const [resend, setResend] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    setError(null);
    // Required-field validation first — never let an empty submit read as "invalid credentials".
    const missingId = !identifier.trim();
    const missingPw = !password;
    setIdError(missingId ? t("auth.enterEmail") : null);
    setPwError(missingPw ? t("auth.enterPassword") : null);
    if (missingId || missingPw) return;
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
        if (code === "email_not_confirmed") {
          setResendEmail(email);
          setError(t("auth.errorEmailUnconfirmed"));
        } else setError(t("auth.errorInvalid"));
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

  async function resendConfirmation() {
    const email = resendEmail ?? (identifier.includes("@") ? identifier.trim() : "");
    if (!email || resend === "sending" || resend === "sent") return;
    setResend("sending");
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: authCallbackUrl("/onboarding") } });
    setResend(resendError ? "error" : "sent");
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
            onChangeText={(v) => { setIdentifier(v); if (idError) setIdError(null); }}
            error={idError ?? undefined}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            autoComplete="username"
            returnKeyType="next"
          />
          <PasswordInput
            label={t("auth.password")}
            value={password}
            onChangeText={(v) => { setPassword(v); if (pwError) setPwError(null); }}
            error={pwError ?? undefined}
            textContentType="password"
            autoComplete="current-password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          <Pressable onPress={() => router.push("/forgot-password")} hitSlop={8} style={styles.forgotWrap}>
            <Text style={styles.forgot}>{t("auth.forgotTitle")}</Text>
          </Pressable>

          {error ? <FormAlert message={error} /> : null}
          {resendEmail ? (
            <View style={styles.resend}>
              {resend === "sent" ? <Text style={styles.sent}>{t("auth.verifyBannerSent")}</Text> : <Pressable onPress={resendConfirmation} disabled={resend === "sending"}><Text style={styles.link}>{resend === "sending" ? t("auth.verifyBannerSending") : t("auth.resendConfirmation")}</Text></Pressable>}
              {resend === "error" ? <Text style={styles.error}>{t("auth.verifyBannerError")}</Text> : null}
            </View>
          ) : null}

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
  resend: { gap: spacing.xs, borderWidth: 1, borderColor: colors.warning, borderRadius: 10, padding: spacing.sm },
  sent: { color: colors.green, fontSize: 13, fontWeight: "700" },
  forgotWrap: { alignSelf: "flex-end", paddingVertical: spacing.xs },
  forgot: { color: colors.green, fontSize: 13, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.md, flexWrap: "wrap" },
  muted: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.green, fontSize: 14, fontWeight: "700" },
});
