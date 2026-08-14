import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import {
  disableBiometricSignIn,
  hasBiometricSignIn,
  isBiometricAvailable,
  refreshSealedToken,
  unsealSessionFor,
} from "../src/lib/biometrics";
import {
  clearBiometricSignInAccount,
  clearRememberedIdentifier,
  getBiometricSignInAccount,
  getRememberedIdentifier,
  setRememberedIdentifier,
} from "../src/lib/remember-me";
import { authCallbackUrl } from "../src/lib/auth-redirect";
import { t } from "../src/i18n";
import { colors, spacing } from "../src/theme";
import { AuthCard, Button, Checkbox, FormAlert, Icon, Input, Logo, PasswordInput } from "../src/components/ui";
import { Fingerprint } from "lucide-react-native";
import { BrandBackground } from "../src/components/BrandBackground";
import { Reveal } from "../src/components/motion";

/** Email/username + password sign-in (web `LoginForm`). A username is resolved to
 *  its account email via the `email_for_username` RPC first. On success the
 *  persisted session updates every auth-reactive screen; if opened with a `next`
 *  target (e.g. from the Add-listing guard) it returns there. */
export default function Login() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState<string | null>(null);
  const [resend, setResend] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [remember, setRemember] = useState(false);
  /** The account that has sealed a session on this device, if any. */
  const [bioAccount, setBioAccount] = useState<{ uid: string; label: string } | null>(null);
  const [bioBusy, setBioBusy] = useState(false);

  // Prefill the remembered identifier, and offer biometric sign-in only if THIS device
  // has a sealed session for the last account that used it.
  useEffect(() => {
    let active = true;
    void (async () => {
      const [saved, last] = await Promise.all([
        getRememberedIdentifier(),
        getBiometricSignInAccount(),
      ]);
      if (!active) return;
      if (saved) {
        setIdentifier(saved);
        setRemember(true);
      }
      if (last && (await isBiometricAvailable()) && (await hasBiometricSignIn(last.uid))) {
        if (active) setBioAccount(last);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  /**
   * Restore the sealed session behind a biometric check. No password is involved and
   * none is stored — the keychain holds a refresh token, which Supabase exchanges for a
   * fresh session. Only the account that enrolled on this device can be restored.
   */
  async function biometricSignIn() {
    if (bioBusy || !bioAccount) return;
    setBioBusy(true);
    setError(null);
    try {
      const { result, refreshToken } = await unsealSessionFor(bioAccount.uid);
      if (result === "cancelled") return;
      if (result !== "ok" || !refreshToken) {
        setError(result === "unavailable" ? t("biometric.unavailable") : t("auth.errorGeneric"));
        return;
      }
      const { data, error: sessErr } = await supabase.auth.setSession({
        access_token: "",
        refresh_token: refreshToken,
      });
      if (sessErr || !data.session) {
        // The token was revoked (e.g. a full sign-out elsewhere, or a password change).
        // Drop the stale enrolment so we stop offering a button that cannot work.
        await disableBiometricSignIn(bioAccount.uid);
        await clearBiometricSignInAccount();
        setBioAccount(null);
        setError(t("biometric.signInExpired"));
        return;
      }
      // Refresh tokens rotate on use — reseal so the next attempt still works.
      if (data.session.refresh_token) {
        await refreshSealedToken(bioAccount.uid, data.session.refresh_token);
      }
      goNext();
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setBioBusy(false);
    }
  }

  /** Where to land after a successful sign-in. */
  function goNext() {
    if (typeof next === "string" && next.startsWith("/")) return router.replace(next as never);
    if (router.canGoBack()) return router.back();
    router.replace("/(tabs)/profile");
  }

  async function submit() {
    if (busy) return; // defensive re-entrancy guard (login also submits via the password field's onSubmitEditing)
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
      // Honour the Remember me choice now that we know the credentials were good.
      if (remember) await setRememberedIdentifier(identifier.trim());
      else await clearRememberedIdentifier();
      goNext(); // session set → onAuthStateChange updates the app
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

  const registerHref = typeof next === "string" ? { pathname: "/register" as const, params: { next } } : "/register";

  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <BrandBackground>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Reveal delay={0}>
              <Logo markSize={44} textSize={28} style={styles.wordmark} />
            </Reveal>

            <Reveal delay={90}>
              <AuthCard>
                <Text style={styles.title}>{t("auth.loginTitle")}</Text>
                <Text style={styles.subtitle}>{t("auth.loginSubtitle")}</Text>

                <View style={styles.fields}>
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

                  {/* Remembers only the identifier you typed — never a password. */}
                  <Checkbox
                    checked={remember}
                    onChange={(v) => {
                      setRemember(v);
                      if (!v) void clearRememberedIdentifier(); // take effect immediately
                    }}
                    label={t("auth.rememberMe")}
                  />

                  <Pressable onPress={() => router.push("/forgot-password")} hitSlop={8} style={styles.forgotWrap}>
                    <Text style={styles.forgot}>{t("auth.forgotTitle")}</Text>
                  </Pressable>

                  {error ? <FormAlert message={error} /> : null}
                  {resendEmail ? (
                    <View style={styles.resend}>
                      {resend === "sent" ? <Text style={styles.sent}>{t("auth.verifyBannerSent")}</Text> : <Pressable onPress={resendConfirmation} disabled={resend === "sending"}><Text style={styles.link}>{resend === "sending" ? t("auth.verifyBannerSending") : t("auth.resendConfirmation")}</Text></Pressable>}
                      {resend === "error" ? <Text style={styles.errorText}>{t("auth.verifyBannerError")}</Text> : null}
                    </View>
                  ) : null}

                  <Button label={t("auth.loginButton")} onPress={submit} loading={busy} pill fullWidth />

                  {/* Only shown when THIS device holds a sealed session for an account
                      and biometrics are actually usable. Distinct from App Lock: this
                      creates a session, it does not merely uncover one. */}
                  {bioAccount ? (
                    <View style={styles.bioWrap}>
                      <Text style={styles.bioHint}>{t("auth.orDivider")}</Text>
                      <Button
                        variant="secondary"
                        label={t("auth.biometricSignIn", { name: bioAccount.label })}
                        onPress={biometricSignIn}
                        loading={bioBusy}
                        pill
                        fullWidth
                        leftIcon={<Icon icon={Fingerprint} size={16} color={colors.green} />}
                      />
                    </View>
                  ) : null}
                </View>
              </AuthCard>
            </Reveal>

            <Reveal delay={180}>
              <View style={styles.footer}>
                <Text style={styles.muted}>{t("auth.noAccount")} </Text>
                <Text style={styles.link} onPress={() => router.push(registerHref as never)}>{t("auth.createOne")}</Text>
              </View>
            </Reveal>
          </ScrollView>
        </KeyboardAvoidingView>
      </BrandBackground>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, flexGrow: 1, justifyContent: "center", paddingBottom: spacing["2xl"] },
  wordmark: { alignSelf: "center", marginBottom: spacing.xl },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.2 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 6, lineHeight: 20 },
  fields: { gap: spacing.md, marginTop: spacing.lg },
  errorText: { color: colors.danger, fontSize: 13 },
  resend: { gap: spacing.xs, borderWidth: 1, borderColor: colors.warning, borderRadius: 10, padding: spacing.sm },
  sent: { color: colors.green, fontSize: 13, fontWeight: "700" },
  bioWrap: { gap: spacing.sm, marginTop: spacing.xs },
  bioHint: { color: colors.textFaint, fontSize: 12, textAlign: "center" },
  forgotWrap: { alignSelf: "flex-end", paddingVertical: spacing.xs },
  forgot: { color: colors.green, fontSize: 13, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl, flexWrap: "wrap" },
  muted: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.green, fontSize: 14, fontWeight: "700" },
});
