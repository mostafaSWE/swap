import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MailCheck } from "lucide-react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { COUNTRIES, COUNTRY_BY_ID, citiesByCountry } from "@swap/config";
import { localizedName } from "@swap/ui";
import { updateProfile } from "@swap/api";
import { supabase } from "../src/lib/supabase";
import { buildPhone } from "../src/lib/phone";
import { authCallbackUrl } from "../src/lib/auth-redirect";
import { locale, t } from "../src/i18n";
import { colors, radii, spacing } from "../src/theme";
import { AuthCard, Button, Checkbox, FormAlert, FormSection, Icon, Input, Logo, PasswordInput, PasswordRequirements, Select, StrengthMeter } from "../src/components/ui";
import { BrandBackground } from "../src/components/BrandBackground";
import { Reveal } from "../src/components/motion";

// Password rules mirror the web (`PasswordStrength`): >=8 chars + a letter + a number.
const pwOk = (v: string) => v.length >= 8 && /[a-zA-Z]/.test(v) && /[0-9]/.test(v);
const pwScore = (v: string) => {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[a-zA-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (v.length >= 12 || /[^a-zA-Z0-9]/.test(v)) s++;
  return s;
};
const STRENGTH = ["", "strengthWeak", "strengthFair", "strengthGood", "strengthStrong"] as const;

/** Email/password sign-up (web `RegisterForm`) — grouped into Personal / Location /
 *  Contact / Security sections on the branded shell. Profile row is created by the
 *  DB `handle_new_user` trigger from the signUp metadata — the app must NOT insert it. */
export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [countryId, setCountryId] = useState<string>();
  const [cityId, setCityId] = useState<string>();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const dialCode = (countryId && COUNTRY_BY_ID[countryId]?.phone_code) || "+966";
  const countryOptions = useMemo(() => COUNTRIES.map((c) => ({ value: c.id, label: localizedName(c, locale) })), []);
  const cityOptions = useMemo(
    () => (countryId ? citiesByCountry(countryId).map((c) => ({ value: c.id, label: localizedName(c, locale) })) : []),
    [countryId],
  );
  useEffect(() => setCityId(undefined), [countryId]);

  const loginHref = typeof next === "string" ? { pathname: "/login" as const, params: { next } } : "/login";

  async function submit() {
    if (busy) return; // defensive re-entrancy guard, matching the sibling auth screens
    setError(null);
    if (!fullName.trim()) return setError(t("auth.errorGeneric"));
    if (username.trim().length < 3 || username.trim().length > 30 || !/^[a-zA-Z0-9_.]+$/.test(username.trim())) return setError(t("auth.usernameInvalid"));
    if (!email.includes("@")) return setError(t("auth.errorGeneric"));
    const normalizedPhone = buildPhone(phone, dialCode);
    if (!normalizedPhone) return setError(t("auth.phoneInvalid"));
    if (!pwOk(password)) return setError(t("auth.passwordWeak"));
    if (password !== confirm) return setError(t("auth.passwordMismatch"));
    if (!terms) return setError(t("auth.termsRequired"));

    setBusy(true);
    try {
      // Pre-flight uniqueness (fails open — the DB also enforces both).
      const { data: taken } = await supabase.rpc("signup_identifier_taken", { uname: username.trim(), uphone: normalizedPhone });
      if (taken === "username") return setError(t("auth.usernameTaken"));
      if (taken === "phone") return setError(t("auth.phoneTaken"));

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim(), username: username.trim(), phone: normalizedPhone, preferred_language: locale },
          emailRedirectTo: authCallbackUrl("/onboarding"),
        },
      });
      if (signUpErr) return setError(t("auth.errorGeneric"));

      // Email confirmation is ON → no session yet: tell the user to check their inbox.
      if (!data.session) {
        setEmailSent(true);
        return;
      }
      // Confirmation OFF → persist country/city (not in the trigger), then into the app.
      if (data.user && (countryId || cityId)) {
        try {
          await updateProfile(supabase, data.user.id, { country_id: countryId ?? null, city_id: cityId ?? null });
        } catch {
          /* non-fatal — completed in onboarding */
        }
      }
      router.replace(typeof next === "string" && next.startsWith("/") ? (next as never) : "/(tabs)/profile");
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  if (emailSent) {
    return (
      <>
        <Stack.Screen options={{ title: "" }} />
        <BrandBackground>
          <View style={styles.sentWrap}>
            <Reveal delay={40}>
              <AuthCard>
                <View style={styles.successBadge}>
                  <Icon icon={MailCheck} size={26} color={colors.green} />
                </View>
                <Text style={styles.sentTitle}>{t("auth.confirmEmailTitle")}</Text>
                <Text style={styles.sentBody}>{t("auth.confirmEmailBody")}</Text>
                <View style={styles.sentAction}>
                  <Button label={t("auth.backToLogin")} variant="secondary" onPress={() => router.replace(loginHref as never)} fullWidth />
                </View>
              </AuthCard>
            </Reveal>
          </View>
        </BrandBackground>
      </>
    );
  }

  const score = pwScore(password);
  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <BrandBackground>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Reveal delay={0}>
              <Logo markSize={42} textSize={26} style={styles.wordmark} />
            </Reveal>

            <Reveal delay={90}>
              <AuthCard>
                <Text style={styles.title}>{t("auth.registerTitle")}</Text>
                <Text style={styles.subtitle}>{t("auth.registerSubtitle")}</Text>

                <View style={styles.sections}>
                  <FormSection label={t("auth.secPersonal")}>
                    <Input label={t("auth.fullName")} value={fullName} onChangeText={setFullName} textContentType="name" autoComplete="name" />
                    <Input label={t("auth.username")} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} textContentType="username" autoComplete="username" />
                  </FormSection>

                  <FormSection label={t("auth.secLocation")}>
                    <Select label={t("auth.country")} placeholder={t("common.selectCountry")} value={countryId} onChange={setCountryId} options={countryOptions} />
                    <Select label={t("auth.city")} placeholder={t("common.selectCity")} value={cityId} onChange={setCityId} options={cityOptions} disabled={!countryId} />
                  </FormSection>

                  <FormSection label={t("auth.secContact")}>
                    <Input label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
                    <Input label={`${t("auth.phone")} (${dialCode})`} value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" placeholder="5XXXXXXXX" />
                  </FormSection>

                  <FormSection label={t("auth.secSecurity")}>
                    <View>
                      <PasswordInput label={t("auth.password")} value={password} onChangeText={setPassword} textContentType="newPassword" autoComplete="new-password" />
                      {password ? (
                        <View style={styles.strength}>
                          <StrengthMeter score={score} label={score > 0 ? t(`auth.${STRENGTH[score]}`) : undefined} />
                          <PasswordRequirements value={password} />
                        </View>
                      ) : null}
                    </View>
                    <PasswordInput label={t("auth.confirmPassword")} value={confirm} onChangeText={setConfirm} textContentType="newPassword" autoComplete="new-password" />
                  </FormSection>
                </View>

                <View style={styles.consent}>
                  <Checkbox
                    checked={terms}
                    onChange={setTerms}
                    label={`${t("auth.termsAgreePrefix")} ${t("auth.termsLink")} ${t("auth.termsAgreeMiddle")} ${t("auth.privacyLink")}`}
                  />
                  <View style={styles.legalLinks}>
                    <Text style={styles.link} onPress={() => router.push("/terms")} accessibilityRole="link">{t("auth.termsLink")}</Text>
                    <Text style={styles.legalDot}>·</Text>
                    <Text style={styles.link} onPress={() => router.push("/privacy")} accessibilityRole="link">{t("auth.privacyLink")}</Text>
                  </View>
                </View>

                {error ? <FormAlert message={error} /> : null}
                <View style={styles.submit}>
                  <Button label={t("auth.registerButton")} onPress={submit} loading={busy} pill fullWidth />
                </View>
              </AuthCard>
            </Reveal>

            <Reveal delay={180}>
              <View style={styles.footer}>
                <Text style={styles.muted}>{t("auth.haveAccount")} </Text>
                <Text style={styles.link} onPress={() => router.replace(loginHref as never)}>{t("auth.loginInstead")}</Text>
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
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  wordmark: { alignSelf: "center", marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.2 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 6, lineHeight: 20, marginBottom: spacing.lg },
  sections: { gap: spacing.xl },
  strength: { marginTop: 6 },
  consent: {
    marginTop: spacing.lg,
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  legalLinks: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingStart: 30 },
  legalDot: { color: colors.textFaint, fontSize: 14 },
  submit: { marginTop: spacing.lg },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl, flexWrap: "wrap" },
  muted: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.green, fontSize: 14, fontWeight: "700" },
  // success (email-sent) state — standardized badge, matching the shell
  sentWrap: { flex: 1, justifyContent: "center", padding: spacing.lg },
  successBadge: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.greenLight, borderWidth: 1, borderColor: "rgba(24,182,106,0.25)", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: spacing.md },
  sentTitle: { color: colors.text, fontSize: 20, fontWeight: "800", textAlign: "center" },
  sentBody: { color: colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 21, marginTop: spacing.sm },
  sentAction: { marginTop: spacing.lg },
});
