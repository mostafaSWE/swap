import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CircleCheck } from "lucide-react-native";
import { COUNTRIES, citiesByCountry } from "@swap/config";
import type { Profile } from "@swap/types";
import { getProfileById, updateProfile } from "@swap/api";
import { localizedName } from "@swap/ui";
import { supabase } from "../src/lib/supabase";
import { acquireImages, uploadAvatar } from "../src/lib/upload";
import { locale, t } from "../src/i18n";
import { colors, radii, spacing } from "../src/theme";
import { AvatarUpload } from "../src/components/AvatarUpload";
import { AuthCard, Button, FormSection, Icon, Input, Logo, Select } from "../src/components/ui";
import { BrandBackground } from "../src/components/BrandBackground";
import { Reveal } from "../src/components/motion";

/** Native version of web OnboardingForm: avatar upload persists immediately;
 * the remaining optional trust profile fields save on Continue. Presented on the
 * branded shell so first-run matches the auth screens. */
export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    const picked = await acquireImages(1);
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
      <Stack.Screen options={{ title: "" }} />
      <BrandBackground>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Reveal delay={0}>
              <Logo markSize={42} textSize={26} style={styles.wordmark} />
            </Reveal>

            <Reveal delay={90}>
              <AuthCard>
                {confirmed ? (
                  <View style={styles.confirmed}>
                    <Icon icon={CircleCheck} size={18} color={colors.green} />
                    <Text style={styles.confirmedText}>{t(confirmed === "email_change" ? "onboarding.emailChangedBanner" : "onboarding.emailConfirmedBanner")}</Text>
                  </View>
                ) : null}

                <Text style={styles.title}>{t("onboarding.title")}</Text>
                <Text style={styles.subtitle}>{t("onboarding.subtitle")}</Text>

                <View style={styles.avatarWrap}>
                  <AvatarUpload uri={avatarUrl} name={name} onPick={chooseAvatar} busy={avatarBusy} error={avatarError} />
                </View>

                <View style={styles.sections}>
                  <FormSection label={t("auth.secPersonal")}>
                    <Input label={t("auth.fullName")} value={name} onChangeText={setName} textContentType="name" autoComplete="name" />
                  </FormSection>
                  <FormSection label={t("auth.secLocation")}>
                    <Select label={t("auth.country")} placeholder={t("common.selectCountry")} value={countryId} onChange={(value) => { setCountryId(value); setCityId(undefined); }} options={countryOptions} />
                    <Select label={t("auth.city")} placeholder={t("common.selectCity")} value={cityId} onChange={setCityId} options={cityOptions} disabled={!countryId} />
                  </FormSection>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.actions}>
                  <Button label={t("onboarding.complete")} onPress={save} loading={busy} pill fullWidth />
                  <Button label={t("onboarding.skip")} variant="ghost" onPress={() => router.replace("/(tabs)")} disabled={busy} fullWidth />
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
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  wordmark: { alignSelf: "center", marginBottom: spacing.lg },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", letterSpacing: -0.2, textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 6, marginBottom: spacing.lg, lineHeight: 20 },
  avatarWrap: { alignItems: "center", marginBottom: spacing.lg },
  sections: { gap: spacing.xl },
  confirmed: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: "rgba(24,182,106,0.25)",
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  confirmedText: { color: colors.green, fontSize: 13, fontWeight: "700", flex: 1 },
  actions: { marginTop: spacing.lg, gap: spacing.sm },
  error: { color: colors.danger, fontSize: 13, textAlign: "center", marginTop: spacing.md },
});
