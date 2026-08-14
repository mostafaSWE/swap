import { useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { Archive, Trash2, TriangleAlert } from "lucide-react-native";
import { api } from "../src/lib/api";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/lib/useAuth";
import { t, tList } from "../src/i18n";
import { colors, spacing } from "../src/theme";
import { Button, Card, Checkbox, FormAlert, Icon, Textarea } from "../src/components/ui";
import { SignInGate } from "../src/components/SignInGate";

/**
 * In-app account deletion (Google Play User Data policy / Apple 5.1.1(v)) — the
 * native counterpart of the web delete-account flow, reached from
 * Settings → Account & privacy.
 *
 * Route-level auth guard, same shape as /new-listing: a signed-out user gets the
 * shared `SignInGate` instead of the form. While the post-deletion sign-out is in
 * flight the session flips to "guest", so `deleted` short-circuits to the spinner
 * — someone who just deleted their account must never be shown a "please sign in"
 * prompt on the way out.
 */
export default function DeleteAccountScreen() {
  const { status } = useAuth();
  const [deleted, setDeleted] = useState(false);

  return (
    <>
      <Stack.Screen options={{ title: t("deleteAccount.title") }} />
      {status === "loading" || deleted ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.green} />
        </View>
      ) : status === "guest" ? (
        <SignInGate
          icon={Trash2}
          title={t("deleteAccount.signInTitle")}
          body={t("deleteAccount.signInBody")}
          next="/delete-account"
        />
      ) : (
        <DeleteAccountForm onDeleted={() => setDeleted(true)} />
      )}
    </>
  );
}

/**
 * Tear the session down locally, whatever the network says.
 *
 * `supabase.auth.signOut()` RESOLVES with `{ error }` rather than throwing, and
 * auth-js returns early WITHOUT clearing the persisted session when the /logout
 * call fails with anything other than 401/403/404. Offline or on a 5xx that would
 * leave the AsyncStorage session intact, so `useAuth` keeps reporting "authed"
 * across restarts — a ghost login for an account that no longer exists. The account
 * is already deleted at this point, so always force the local teardown.
 */
async function signOutCompletely(): Promise<void> {
  const { error } = await supabase.auth.signOut().catch((e: unknown) => ({ error: e }));
  if (!error) return;
  // `scope: "local"` skips the server round-trip and just drops the stored session.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
}

/**
 * The disclosure + confirmation form. Two deliberate gates stand between the user
 * and an irreversible purge: a checkbox they must actively tick (which enables the
 * button) and a native destructive `Alert`. No typed confirmation word — that would
 * force Arabic users to type Latin characters.
 */
function DeleteAccountForm({ onDeleted }: { onDeleted: () => void }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Synchronous double-submit guard: state updates are async, so the ref is what
  // actually closes the door between two fast taps (see release-plan batch 8).
  const busyRef = useRef(false);
  // Separate latch for the native Alert, which opens before `busy` is ever set.
  const alertRef = useRef(false);

  async function destroy() {
    if (busyRef.current || !confirmed) return;
    busyRef.current = true; // flipped BEFORE any await
    setBusy(true);
    setError(null);
    try {
      const note = reason.trim();
      await api.deleteAccount({ confirm: true, reason: note ? note : undefined });
    } catch (err) {
      // A 401/404 means the account is ALREADY gone: either the delete succeeded but
      // the 20s client timeout fired first, or this is a retry after one did. Treat it
      // as success — otherwise the user is stuck forever on "check your connection"
      // while signed in to an account that no longer exists.
      const status = (err as { status?: number })?.status;
      if (status !== 401 && status !== 404) {
        busyRef.current = false;
        setBusy(false);
        setError(t("deleteAccount.error"));
        return;
      }
    }
    // Deleted server-side. Stay in the "busy" state (never re-enable) and hand the
    // screen the spinner while we tear the session down and reset navigation.
    onDeleted();
    await signOutCompletely();
    // `replace` alone only swaps the focused route — the stack here is
    // [(tabs), settings, delete-account], so back would land on Settings (which
    // re-offers Delete account). Dismiss the pushed screens first.
    router.dismissAll();
    router.replace("/(tabs)");
  }

  function confirmDestroy() {
    if (busyRef.current || alertRef.current || !confirmed) return;
    // Latch BEFORE presenting: the Button is still enabled at this point (busy is
    // false until the alert is confirmed), so two fast taps would stack two alerts.
    alertRef.current = true;
    Alert.alert(t("deleteAccount.confirmTitle"), t("deleteAccount.confirmBody"), [
      {
        text: t("common.cancel"),
        style: "cancel",
        onPress: () => {
          alertRef.current = false;
        },
      },
      { text: t("deleteAccount.confirmAction"), style: "destructive", onPress: () => void destroy() },
    ]);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <SectionHead icon={TriangleAlert} tone={colors.danger} title={t("deleteAccount.heading")} />
          <Text style={styles.body}>{t("deleteAccount.intro")}</Text>
          <Text style={styles.warning}>{t("deleteAccount.immediate")}</Text>
        </Card>

        <Card style={styles.card}>
          <SectionHead icon={Trash2} tone={colors.danger} title={t("deleteAccount.removedTitle")} />
          <Bullets tone={colors.danger} items={tList<string>("deleteAccount.removed")} />
        </Card>

        <Card style={styles.card}>
          <SectionHead icon={Archive} tone={colors.warning} title={t("deleteAccount.keptTitle")} />
          <Text style={styles.body}>{t("deleteAccount.keptIntro")}</Text>
          <Bullets tone={colors.warning} items={tList<string>("deleteAccount.kept")} />
          <Text style={styles.note}>{t("deleteAccount.keptWhy")}</Text>
        </Card>

        <Textarea
          label={t("deleteAccount.reasonLabel")}
          hint={`${reason.length}/500`}
          placeholder={t("deleteAccount.reasonPlaceholder")}
          value={reason}
          onChangeText={setReason}
          maxLength={500}
          editable={!busy}
        />

        <Checkbox checked={confirmed} onChange={setConfirmed} label={t("deleteAccount.confirmLabel")} />

        {error ? <FormAlert message={error} /> : null}

        <Button
          label={t("deleteAccount.submit")}
          variant="danger"
          onPress={confirmDestroy}
          disabled={!confirmed}
          loading={busy}
          leftIcon={<Icon icon={Trash2} size={16} color={colors.danger} />}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Card heading: tinted icon + tinted title. The row auto-flips under RTL. */
function SectionHead({ icon, tone, title }: { icon: LucideIcon; tone: string; title: string }) {
  return (
    <View style={styles.head}>
      <Icon icon={icon} size={18} color={tone} />
      <Text style={[styles.headTitle, { color: tone }]} accessibilityRole="header">{title}</Text>
    </View>
  );
}

/** Bulleted disclosure list (same shape as `SafetyDisclaimer`'s full variant). */
function Bullets({ items, tone }: { items: string[]; tone: string }) {
  return (
    <View style={styles.bullets}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={[styles.bullet, { color: tone }]}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  card: { gap: spacing.sm },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headTitle: { flex: 1, fontSize: 16, fontWeight: "800" },
  body: { color: colors.text, fontSize: 14, lineHeight: 21 },
  warning: { color: colors.danger, fontSize: 14, lineHeight: 21, fontWeight: "700" },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  bullets: { gap: 4 },
  bulletRow: { flexDirection: "row", gap: spacing.sm, paddingStart: spacing.xs },
  bullet: { fontSize: 13, lineHeight: 20 },
  bulletText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 20 },
});
