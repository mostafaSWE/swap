import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { supabase } from "../src/lib/supabase";
import { t } from "../src/i18n";
import { colors, radii, spacing } from "../src/theme";
import { Button, Icon, Input } from "../src/components/ui";

/**
 * Request a password-reset email (web `ForgotPasswordForm`). We **always** show
 * the "sent" state — never reveal whether an email is registered. No explicit
 * `redirectTo`: Supabase uses the project Site URL (the web reset flow), matching
 * register's email flow; the fully in-app reset deep link lands with M5.
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
      await supabase.auth.resetPasswordForEmail(email.trim());
    } catch {
      // swallow — never reveal registration status
    } finally {
      setSent(true); // always show success
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t("auth.forgotTitle") }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {sent ? (
            <View style={styles.sentWrap}>
              <View style={styles.mailBadge}>
                <Icon icon={MailCheck} size={30} color={colors.green} />
              </View>
              <Text style={styles.title}>{t("auth.forgotTitle")}</Text>
              <Text style={styles.sentText}>{t("auth.forgotSent")}</Text>
              <Text style={styles.link} onPress={() => router.replace("/login")}>
                {t("auth.backToLogin")}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.title}>{t("auth.forgotTitle")}</Text>
              <Text style={styles.subtitle}>{t("auth.forgotHint")}</Text>

              <Input
                label={t("auth.email")}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="go"
                onSubmitEditing={submit}
              />

              <Button
                label={t("auth.forgotSubmit")}
                onPress={submit}
                loading={busy}
                disabled={!email.trim()}
                fullWidth
              />

              <View style={styles.footer}>
                <Text style={styles.link} onPress={() => router.back()}>
                  {t("auth.backToLogin")}
                </Text>
              </View>
            </>
          )}
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
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.md },
  link: { color: colors.green, fontSize: 14, fontWeight: "700" },
  sentWrap: { alignItems: "center", gap: spacing.md },
  mailBadge: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  sentText: { color: colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
