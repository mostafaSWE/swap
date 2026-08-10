import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { colors, radii, spacing } from "../theme";
import { t } from "../i18n";
import { AuthCard, Button, Icon } from "./ui";
import { BrandBackground } from "./BrandBackground";
import { Reveal } from "./motion";

/**
 * The shared branded sign-in gate — the premium prompt shown wherever a signed-out
 * user hits a members-only surface (Add-Listing, Profile, Messages, Saved, …). It is
 * the SAME composition as the /new-listing gate (`BrandBackground` + `AuthCard` +
 * staggered `Reveal`s + a greenLight icon badge), factored out so every "please sign
 * in" state looks identical instead of a bland `EmptyState`.
 *
 * Header ownership stays with the caller: a Stack screen sets its own
 * `Stack.Screen title:""`; a tab screen keeps its tab header above the gate.
 * Routes to /login and /register carrying a `next` return-to destination.
 */
export function SignInGate({
  icon,
  title,
  body,
  next,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  next: string;
}) {
  const router = useRouter();
  return (
    <BrandBackground>
      <View style={styles.wrap}>
        <Reveal delay={40}>
          <AuthCard>
            <View style={styles.badge}>
              <Icon icon={icon} size={26} color={colors.green} />
            </View>
            <Text style={styles.title}>{title}</Text>
            {body ? <Text style={styles.body}>{body}</Text> : null}
            <Reveal delay={140} distance={8}>
              <View style={styles.actions}>
                <Button
                  label={t("mobile.profile.signIn")}
                  onPress={() => router.push({ pathname: "/login", params: { next } })}
                  pill
                  fullWidth
                />
                <Button
                  label={t("auth.registerButton")}
                  variant="secondary"
                  onPress={() => router.push({ pathname: "/register", params: { next } })}
                  fullWidth
                />
              </View>
            </Reveal>
          </AuthCard>
        </Reveal>
      </View>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: spacing.lg },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.greenLight,
    borderWidth: 1,
    borderColor: "rgba(24,182,106,0.25)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "800", textAlign: "center" },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
});
