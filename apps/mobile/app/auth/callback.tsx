import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { t } from "../../src/i18n";
import { colors, spacing } from "../../src/theme";
import { Button } from "../../src/components/ui";

type OtpType = "signup" | "recovery" | "magiclink" | "email_change" | "invite" | "email";

/** Handles the token-hash links used by the web callback, but establishes the
 * session inside the Expo client and routes to native onboarding/reset UI. */
export default function AuthCallback() {
  const router = useRouter();
  const { token_hash, type, next } = useLocalSearchParams<{ token_hash?: string; type?: string; next?: string }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    async function verify() {
      if (!token_hash || !type) {
        if (active) setError(true);
        return;
      }
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash, type: type as OtpType });
      if (!active) return;
      if (verifyError) {
        setError(true);
        return;
      }
      if (type === "recovery" || next === "/reset-password") router.replace("/reset-password");
      else router.replace({ pathname: "/onboarding", params: { confirmed: type === "email_change" ? "email_change" : "1" } });
    }
    void verify();
    return () => {
      active = false;
    };
  }, [token_hash, type, next]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>
        {error ? (
          <>
            <Text style={styles.title}>{t("auth.linkExpired")}</Text>
            <Button label={t("auth.backToLogin")} onPress={() => router.replace("/login")} fullWidth />
          </>
        ) : <ActivityIndicator color={colors.green} />}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 16, fontWeight: "700", textAlign: "center" },
});
