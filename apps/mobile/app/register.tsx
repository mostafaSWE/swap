import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { MailCheck } from "lucide-react-native";
import { Stack, useRouter } from "expo-router";
import { COUNTRIES, COUNTRY_BY_ID, citiesByCountry } from "@swap/config";
import { localizedName } from "@swap/ui";
import { updateProfile } from "@swap/api";
import { supabase } from "../src/lib/supabase";
import { buildPhone } from "../src/lib/phone";
import { locale, t } from "../src/i18n";
import { colors, radii, spacing } from "../src/theme";
import { Button, Checkbox, Icon, Input, Select, StrengthMeter } from "../src/components/ui";

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

/** Email/password sign-up (web `RegisterForm`). Profile row is created by the DB
 *  `handle_new_user` trigger from the signUp metadata — the app must NOT insert it. */
export default function Register() {
  const router = useRouter();
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

  async function submit() {
    setError(null);
    if (!fullName.trim()) return setError(t("auth.errorGeneric"));
    if (username.trim().length < 3 || !/^[a-zA-Z0-9_.]+$/.test(username.trim())) return setError(t("auth.usernameInvalid"));
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
        options: { data: { full_name: fullName.trim(), username: username.trim(), phone: normalizedPhone, preferred_language: locale } },
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
      router.replace("/(tabs)/profile");
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  if (emailSent) {
    return (
      <>
        <Stack.Screen options={{ title: t("auth.registerTitle") }} />
        <View style={styles.sentWrap}>
          <View style={styles.sentIcon}><Icon icon={MailCheck} size={28} color={colors.green} /></View>
          <Text style={styles.sentTitle}>{t("auth.confirmEmailTitle")}</Text>
          <Text style={styles.sentBody}>{t("auth.confirmEmailBody")}</Text>
          <Text style={styles.link} onPress={() => router.replace("/login")}>{t("auth.backToLogin")}</Text>
        </View>
      </>
    );
  }

  const score = pwScore(password);
  return (
    <>
      <Stack.Screen options={{ title: t("auth.registerTitle") }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{t("auth.registerTitle")}</Text>
          <Text style={styles.subtitle}>{t("auth.registerSubtitle")}</Text>

          <Input label={t("auth.fullName")} value={fullName} onChangeText={setFullName} />
          <Input label={t("auth.username")} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
          <Select label={t("auth.country")} placeholder={t("auth.country")} value={countryId} onChange={setCountryId} options={countryOptions} />
          {countryId ? (
            <Select label={t("auth.city")} placeholder={t("auth.city")} value={cityId} onChange={setCityId} options={cityOptions} />
          ) : null}
          <Input label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
          <Input label={`${t("auth.phone")} (${dialCode})`} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="5XXXXXXXX" />

          <View>
            <Input label={t("auth.password")} value={password} onChangeText={setPassword} secureTextEntry />
            {password ? (
              <View style={styles.strength}>
                <StrengthMeter score={score} label={score > 0 ? t(`auth.${STRENGTH[score]}`) : undefined} />
              </View>
            ) : null}
          </View>
          <Input label={t("auth.confirmPassword")} value={confirm} onChangeText={setConfirm} secureTextEntry />

          <Checkbox
            checked={terms}
            onChange={setTerms}
            label={`${t("auth.termsAgreePrefix")} ${t("auth.termsLink")} ${t("auth.termsAgreeMiddle")} ${t("auth.privacyLink")}`}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t("auth.registerButton")} onPress={submit} loading={busy} fullWidth />

          <View style={styles.footer}>
            <Text style={styles.muted}>{t("auth.haveAccount")} </Text>
            <Text style={styles.link} onPress={() => router.replace("/login")}>{t("auth.loginInstead")}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.xs },
  strength: { marginTop: 6 },
  error: { color: colors.danger, fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.sm, flexWrap: "wrap" },
  muted: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.green, fontSize: 14, fontWeight: "700" },
  sentWrap: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  sentIcon: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.greenLight, alignItems: "center", justifyContent: "center" },
  sentTitle: { color: colors.text, fontSize: 20, fontWeight: "800", textAlign: "center" },
  sentBody: { color: colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 20 },
});
