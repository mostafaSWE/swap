import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { COUNTRIES, LIMITS, citiesByCountry } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { Profile } from "@swap/types";
import { getProfileById, updateProfile } from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { acquireImages, uploadAvatar } from "../../src/lib/upload";
import { useTerms } from "../../src/lib/terms";
import { locale, t } from "../../src/i18n";
import { colors, radii, spacing } from "../../src/theme";
import { Check } from "lucide-react-native";
import { AvatarUpload } from "../../src/components/AvatarUpload";
import { AuthCard, Button, FormAlert, FormSection, Icon, Input, Select, Textarea } from "../../src/components/ui";
import { BrandBackground } from "../../src/components/BrandBackground";
import { Reveal } from "../../src/components/motion";

/** Mobile counterpart to web EditProfileForm. Avatar replacement persists when
 * picked; the rest is saved together through the shared profile query. Presented
 * on the branded shell (AuthCard + FormSections) to match the account screens —
 * an in-app nested screen, so it keeps the native header title (no wordmark). */
export default function EditProfile() {
  const router = useRouter();
  const { ensureAccepted } = useTerms();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [countryId, setCountryId] = useState<string>();
  const [cityId, setCityId] = useState<string>();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        if (active) router.replace("/login");
        return;
      }
      try {
        const loaded = await getProfileById(supabase, data.user.id);
        if (!active) return;
        setProfile(loaded);
        if (loaded) {
          setFullName(loaded.full_name);
          setUsername(loaded.username);
          setPhone(loaded.phone ?? "");
          setBio(loaded.bio ?? "");
          setCountryId(loaded.country_id ?? undefined);
          setCityId(loaded.city_id ?? undefined);
          setAvatarUrl(loaded.avatar_url);
        }
      } catch {
        if (active) setProfile(null);
      }
    });
    return () => { active = false; };
  }, [router]);

  const countries = useMemo(() => COUNTRIES.map((country) => ({ value: country.id, label: localizedName(country, locale) })), []);
  const cities = useMemo(() => countryId ? citiesByCountry(countryId).map((city) => ({ value: city.id, label: localizedName(city, locale) })) : [], [countryId]);

  async function chooseAvatar() {
    if (!profile || avatarBusy) return;
    if (!(await ensureAccepted())) return; // Apple 1.2 — an avatar is user-uploaded content
    setAvatarError(null);
    const image = (await acquireImages(1))[0];
    if (!image) return;
    setAvatarBusy(true);
    try { setAvatarUrl(await uploadAvatar(profile.id, image)); }
    catch { setAvatarError(t("onboarding.avatarError")); }
    finally { setAvatarBusy(false); }
  }

  async function save() {
    if (!profile || busy) return;
    if (!(await ensureAccepted())) return; // Apple 1.2 — the bio is public UGC
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      await updateProfile(supabase, profile.id, { full_name: fullName.trim(), username: username.trim(), phone: phone.trim(), bio: bio.trim(), country_id: countryId ?? null, city_id: cityId ?? null, avatar_url: avatarUrl });
      setSaved(true);
    } catch {
      setError(t("onboarding.error"));
    } finally {
      setBusy(false);
    }
  }

  if (profile === undefined) {
    return (
      <BrandBackground>
        <View style={styles.center}><ActivityIndicator color={colors.green} /></View>
      </BrandBackground>
    );
  }
  if (!profile) {
    return (
      <BrandBackground>
        <View style={styles.center}><Text style={styles.error}>{t("onboarding.error")}</Text></View>
      </BrandBackground>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t("profile.edit") }} />
      <BrandBackground>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Reveal delay={0}>
              <AuthCard>
                <View style={styles.avatarWrap}>
                  <AvatarUpload uri={avatarUrl} name={fullName} onPick={chooseAvatar} busy={avatarBusy} error={avatarError} />
                </View>

                <View style={styles.sections}>
                  <FormSection label={t("auth.secPersonal")}>
                    <Input label={t("auth.fullName")} value={fullName} onChangeText={setFullName} textContentType="name" autoComplete="name" />
                    <Input label={t("auth.username")} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} textContentType="username" autoComplete="username" />
                    <Input label={t("auth.phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" />
                    <Textarea label={t("profile.bio")} hint={`${bio.length}/${LIMITS.bioMax}`} value={bio} onChangeText={setBio} maxLength={LIMITS.bioMax} />
                  </FormSection>

                  <FormSection label={t("auth.secLocation")}>
                    <Select label={t("auth.country")} placeholder={t("common.selectCountry")} value={countryId} onChange={(value) => { setCountryId(value); setCityId(undefined); }} options={countries} />
                    <Select label={t("auth.city")} placeholder={t("common.selectCity")} value={cityId} onChange={setCityId} options={cities} disabled={!countryId} />
                  </FormSection>
                </View>

                {error ? <View style={styles.alert}><FormAlert message={error} /></View> : null}
                {saved ? (
                  <View style={styles.savedRow}>
                    <Icon icon={Check} size={16} color={colors.green} />
                    <Text style={styles.saved}>{t("common.saved")}</Text>
                  </View>
                ) : null}

                <View style={styles.submit}>
                  <Button label={t("common.save")} onPress={save} loading={busy} pill fullWidth />
                </View>
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
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing["3xl"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  avatarWrap: { alignItems: "center", marginBottom: spacing.lg },
  sections: { gap: spacing.xl },
  alert: { marginTop: spacing.md },
  submit: { marginTop: spacing.lg },
  error: { color: colors.danger, fontSize: 13, textAlign: "center" },
  savedRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, marginTop: spacing.md },
  saved: { color: colors.green, fontSize: 13, fontWeight: "700" },
});
