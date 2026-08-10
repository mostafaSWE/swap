import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { CircleCheckBig } from "lucide-react-native";
import { supabase } from "../src/lib/supabase";
import { t } from "../src/i18n";
import { colors, radii, spacing } from "../src/theme";
import { AuthCard, Button, FormAlert, Icon, PasswordInput, PasswordRequirements, StrengthMeter } from "../src/components/ui";
import { BrandBackground } from "../src/components/BrandBackground";
import { Reveal } from "../src/components/motion";

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
 * this screen updates the password within the resulting Supabase session.
 * Presented on the branded shell to match the sibling auth screens. */
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

  const score = pwScore(password);
  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <BrandBackground>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Reveal delay={0}>
              <Text style={styles.wordmark} accessibilityRole="header">
                Just<Text style={styles.wordmarkAccent}>Swap</Text>
              </Text>
            </Reveal>

            <Reveal delay={90}>
              <AuthCard>
                {done ? (
                  <View style={styles.centerCol}>
                    <View style={styles.successBadge}><Icon icon={CircleCheckBig} size={28} color={colors.green} /></View>
                    <Text style={styles.title}>{t("auth.resetTitle")}</Text>
                    <Text style={styles.sentText}>{t("auth.resetDone")}</Text>
                  </View>
                ) : hasSession === false ? (
                  <View style={styles.centerCol}>
                    <Text style={styles.title}>{t("auth.resetTitle")}</Text>
                    <Text style={styles.sentText}>{t("auth.resetExpired")}</Text>
                    <View style={styles.action}>
                      <Button label={t("auth.forgotTitle")} onPress={() => router.replace("/forgot-password")} pill fullWidth />
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.title}>{t("auth.resetTitle")}</Text>
                    <View style={styles.fields}>
                      <View>
                        <PasswordInput label={t("auth.newPassword")} value={password} onChangeText={setPassword} textContentType="newPassword" autoComplete="new-password" returnKeyType="next" />
                        {password ? (
                          <View style={styles.strength}>
                            <StrengthMeter score={score} label={score > 0 ? t(`auth.${STRENGTH[score]}`) : undefined} />
                            <PasswordRequirements value={password} />
                          </View>
                        ) : null}
                      </View>
                      <PasswordInput label={t("auth.confirmPassword")} value={confirm} onChangeText={setConfirm} textContentType="newPassword" autoComplete="new-password" returnKeyType="go" onSubmitEditing={submit} />
                      {error ? <FormAlert message={error} /> : null}
                      <Button label={t("auth.resetSubmit")} onPress={submit} loading={busy} disabled={hasSession === null} pill fullWidth />
                    </View>
                  </>
                )}
              </AuthCard>
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
  wordmark: { color: colors.white, fontSize: 30, fontWeight: "800", letterSpacing: 0.2, textAlign: "center", marginBottom: spacing.xl },
  wordmarkAccent: { color: colors.green },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.2, textAlign: "center" },
  fields: { gap: spacing.md, marginTop: spacing.lg },
  strength: { marginTop: 6, gap: spacing.xs },
  centerCol: { alignItems: "center" },
  successBadge: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.greenLight, borderWidth: 1, borderColor: "rgba(24,182,106,0.25)", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  sentText: { color: colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: spacing.sm },
  action: { marginTop: spacing.lg, alignSelf: "stretch" },
});
