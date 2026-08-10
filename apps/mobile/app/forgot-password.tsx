import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { supabase } from "../src/lib/supabase";
import { authCallbackUrl } from "../src/lib/auth-redirect";
import { t } from "../src/i18n";
import { colors, radii, spacing } from "../src/theme";
import { AuthCard, Button, Icon, Input } from "../src/components/ui";
import { BrandBackground } from "../src/components/BrandBackground";
import { Reveal } from "../src/components/motion";

/**
 * Request a password-reset email (web `ForgotPasswordForm`). We **always** show
 * the "sent" state — never reveal whether an email is registered. No explicit
 * `redirectTo` targets the same native callback used by signup confirmation.
 */
export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (busy || !email.trim()) return;
    setBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authCallbackUrl("/reset-password") });
    } catch {
      // swallow — never reveal registration status
    } finally {
      setSent(true); // always show success
      setBusy(false);
    }
  }

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
                {sent ? (
                  <View style={styles.sentWrap}>
                    <View style={styles.successBadge}>
                      <Icon icon={MailCheck} size={26} color={colors.green} />
                    </View>
                    <Text style={styles.title}>{t("auth.forgotTitle")}</Text>
                    <Text style={styles.sentText}>{t("auth.forgotSent")}</Text>
                    <View style={styles.sentAction}>
                      <Button label={t("auth.backToLogin")} variant="secondary" onPress={() => router.replace("/login")} fullWidth />
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.title}>{t("auth.forgotTitle")}</Text>
                    <Text style={styles.subtitle}>{t("auth.forgotHint")}</Text>
                    <View style={styles.fields}>
                      <Input
                        label={t("auth.email")}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        textContentType="emailAddress"
                        autoComplete="email"
                        returnKeyType="go"
                        onSubmitEditing={submit}
                      />
                      <Button label={t("auth.forgotSubmit")} onPress={submit} loading={busy} disabled={!email.trim()} pill fullWidth />
                      <Text style={styles.link} onPress={() => router.back()}>{t("auth.backToLogin")}</Text>
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
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 6, lineHeight: 20, textAlign: "center" },
  fields: { gap: spacing.md, marginTop: spacing.lg },
  link: { color: colors.green, fontSize: 14, fontWeight: "700", textAlign: "center", paddingVertical: spacing.xs },
  sentWrap: { alignItems: "center" },
  successBadge: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.greenLight, borderWidth: 1, borderColor: "rgba(24,182,106,0.25)", alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  sentText: { color: colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: spacing.sm },
  sentAction: { marginTop: spacing.lg, alignSelf: "stretch" },
});
