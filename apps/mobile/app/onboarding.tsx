import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { COUNTRIES, citiesByCountry } from "@swap/config";
import type { Profile } from "@swap/types";
import { getProfileById, updateProfile } from "@swap/api";
import { localizedName } from "@swap/ui";
import { supabase } from "../src/lib/supabase";
import { pickImages, uploadAvatar } from "../src/lib/upload";
import { locale, t } from "../src/i18n";
import { colors, spacing } from "../src/theme";
import { AvatarUpload } from "../src/components/AvatarUpload";
import { Button, Input, Select } from "../src/components/ui";

/** Native version of web OnboardingForm: avatar upload persists immediately;
 * the remaining optional trust profile fields save on Continue. */
export default function Onboarding() {
  const router = useRouter();
  const { confirmed } = useLocalSearchParams<{ confirmed?: string }>();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState<string>();
  const [cityId, setCityId] = useState<string>();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
          setName(loaded.full_name);
          setCountryId(loaded.country_id ?? undefined);
          setCityId(loaded.city_id ?? undefined);
          setAvatarUrl(loaded.avatar_url);
        }
      } catch {
        if (active) setProfile(null);
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

  const countryOptions = useMemo(() => COUNTRIES.map((country) => ({ value: country.id, label: localizedName(country, locale) })), []);
  const cityOptions = useMemo(() => countryId ? citiesByCountry(countryId).map((city) => ({ value: city.id, label: localizedName(city, locale) })) : [], [countryId]);

  async function chooseAvatar() {
    if (!profile || avatarBusy) return;
    setAvatarError(null);
    const picked = await pickImages(1);
    const image = picked[0];
    if (!image) return;
    setAvatarBusy(true);
    try {
      setAvatarUrl(await uploadAvatar(profile.id, image));
    } catch {
      setAvatarError(t("onboarding.avatarError"));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function save() {
    if (!profile || busy) return;
    setError(null);
    setBusy(true);
    try {
      await updateProfile(supabase, profile.id, {
        full_name: name.trim() || profile.full_name,
        country_id: countryId ?? null,
        city_id: cityId ?? null,
        avatar_url: avatarUrl,
      });
      router.replace("/(tabs)/profile");
    } catch {
      setError(t("onboarding.error"));
    } finally {
      setBusy(false);
    }
  }

  if (profile === undefined) return <View style={styles.center}><ActivityIndicator color={colors.green} /></View>;
  if (!profile) return <View style={styles.center}><Text style={styles.error}>{t("onboarding.error")}</Text></View>;

  return (
    <>
      <Stack.Screen options={{ title: t("onboarding.title") }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {confirmed ? <Text style={styles.confirmed}>{t(confirmed === "email_change" ? "onboarding.emailChangedBanner" : "onboarding.emailConfirmedBanner")}</Text> : null}
          <Text style={styles.title}>{t("onboarding.title")}</Text>
          <Text style={styles.subtitle}>{t("onboarding.subtitle")}</Text>
          <AvatarUpload uri={avatarUrl} name={name} onPick={chooseAvatar} busy={avatarBusy} error={avatarError} />
          <Input label={t("auth.fullName")} value={name} onChangeText={setName} />
          <Select label={t("auth.country")} placeholder={t("common.selectCountry")} value={countryId} onChange={(value) => { setCountryId(value); setCityId(undefined); }} options={countryOptions} />
          {countryId ? <Select label={t("auth.city")} placeholder={t("common.selectCity")} value={cityId} onChange={setCityId} options={cityOptions} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t("onboarding.complete")} onPress={save} loading={busy} fullWidth />
          <Button label={t("onboarding.skip")} variant="ghost" onPress={() => router.replace("/(tabs)")} disabled={busy} fullWidth />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 25, fontWeight: "800", textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginBottom: spacing.sm },
  confirmed: { color: colors.green, backgroundColor: colors.greenLight, borderRadius: 10, padding: spacing.md, fontSize: 14, fontWeight: "700" },
  error: { color: colors.danger, fontSize: 13, textAlign: "center" },
});
