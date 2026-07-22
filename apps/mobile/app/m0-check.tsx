import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { APP_NAME, SLOGAN } from "@swap/config";
import { getListings } from "@swap/api";
import { supabase } from "../src/lib/supabase";
import { api } from "../src/lib/api";
import { colors, radii, spacing } from "../src/theme";

// Expo inlines EXPO_PUBLIC_* at build time; declare process for typing only.
declare const process: { env: Record<string, string | undefined> };

type Check = "idle" | "pending" | "ok" | "fail";

/**
 * M0 connectivity harness (TEMPORARY — replaced by real screens from M1 on).
 * Proves the mobile app reaches the LIVE backend end-to-end:
 *   - Supabase auth (sign in) + AsyncStorage session persistence (survives a
 *     cold start — reopen the app and the session row is still populated)
 *   - a direct RLS read via the shared @swap/api query layer (getListings)
 *   - an authenticated REST call via the shared SwapApiClient (api.me)
 *   - a Realtime websocket connection
 * See docs/mobile-release-plan.md → Phase M0.
 */
export default function M0Check() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [rls, setRls] = useState<Check>("pending");
  const [rlsCount, setRlsCount] = useState(0);
  const [realtime, setRealtime] = useState<Check>("pending");
  const [rest, setRest] = useState<Check>("idle");
  const [restWho, setRestWho] = useState<string | null>(null);

  // Current session — populated on a cold start iff AsyncStorage persistence works.
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Direct RLS read through the shared query layer (public: active listings only).
  useEffect(() => {
    getListings(supabase, { limit: 6 })
      .then((rows) => {
        setRlsCount(rows.length);
        setRls("ok");
      })
      .catch(() => setRls("fail"));
  }, []);

  // Realtime websocket connectivity (a bare channel is enough to open the socket).
  useEffect(() => {
    const channel = supabase.channel("m0-healthcheck").subscribe((status) => {
      console.log(`[M0] realtime=${status}`);
      if (status === "SUBSCRIBED") setRealtime("ok");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtime("fail");
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // Optional headless auto-smoke for log capture (env-gated; OFF by default).
  // Set EXPO_PUBLIC_M0_AUTOTEST=1 (+ EXPO_PUBLIC_M0_TEST_EMAIL/PASSWORD) to run
  // the full sequence on mount and print [M0] lines to the JS log (adb logcat).
  useEffect(() => {
    if (process.env.EXPO_PUBLIC_M0_AUTOTEST !== "1") return;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      console.log(`[M0] boot-session=${data.session?.user.email ?? "none"}`);
      if (!data.session) {
        const { error } = await supabase.auth.signInWithPassword({
          email: process.env.EXPO_PUBLIC_M0_TEST_EMAIL ?? "",
          password: process.env.EXPO_PUBLIC_M0_TEST_PASSWORD ?? "",
        });
        console.log(`[M0] signin=${error ? "FAIL " + error.message : "ok"}`);
        if (error) return;
      }
      try {
        const rows = await getListings(supabase, { limit: 6 });
        console.log(`[M0] rls=ok count=${rows.length}`);
      } catch (e) {
        console.log(`[M0] rls=FAIL ${e instanceof Error ? e.message : String(e)}`);
      }
      try {
        const me = await api.me();
        console.log(`[M0] rest=ok user=@${me.username ?? me.id}`);
      } catch (e) {
        console.log(`[M0] rest=FAIL ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
  }, []);

  const signIn = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    setMsg(error ? `Sign-in failed: ${error.message}` : "Signed in — now reopen the app to prove persistence.");
  }, [email, password]);

  const signOut = useCallback(async () => {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    setRest("idle");
    setRestWho(null);
    setMsg("Signed out.");
  }, []);

  // Authenticated REST call through the shared SwapApiClient (needs a session).
  const checkRest = useCallback(async () => {
    setRest("pending");
    setRestWho(null);
    try {
      const me = await api.me();
      setRestWho(me.username ?? me.full_name ?? me.id);
      setRest("ok");
    } catch (e) {
      setRest("fail");
      setMsg(`REST /me failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.slogan}>{SLOGAN.en}</Text>
        <Text style={styles.tag}>M0 · live-backend connectivity check</Text>
      </View>

      <View style={styles.card}>
        <StatusRow
          label="Session (persists across restart)"
          value={sessionEmail ?? "— signed out —"}
          state={sessionEmail ? "ok" : "idle"}
        />
        <StatusRow
          label="RLS read · getListings()"
          value={rls === "ok" ? `${rlsCount} active listings` : rls}
          state={rls}
        />
        <StatusRow label="Realtime websocket" value={realtime} state={realtime} />
        <StatusRow
          label="REST · api.me()"
          value={rest === "ok" && restWho ? `@${restWho}` : rest}
          state={rest}
        />
      </View>

      {!sessionEmail && (
        <View style={styles.card}>
          <Text style={styles.h}>Sign in (live Supabase)</Text>
          <TextInput
            style={styles.input}
            placeholder="email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Btn label="Sign in" onPress={signIn} disabled={busy} />
        </View>
      )}

      {sessionEmail && (
        <View style={styles.actions}>
          <Btn label="Check REST /me" onPress={checkRest} disabled={busy} />
          <Btn label="Sign out" onPress={signOut} disabled={busy} variant="ghost" />
        </View>
      )}

      {busy && <ActivityIndicator color={colors.green} />}
      {msg && <Text style={styles.msg}>{msg}</Text>}
    </ScrollView>
  );
}

function StatusRow({ label, value, state }: { label: string; value: string; state: Check }) {
  const dot =
    state === "ok" ? colors.green : state === "fail" ? colors.danger : colors.textFaint;
  return (
    <View style={styles.statusRow}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <View style={styles.statusText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function Btn({
  label,
  onPress,
  disabled,
  variant,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "ghost";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.btn,
        variant === "ghost" && styles.btnGhost,
        disabled && styles.btnDisabled,
      ]}
    >
      <Text style={[styles.btnText, variant === "ghost" && styles.btnGhostText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  brand: { color: colors.green, fontSize: 28, fontWeight: "800" },
  slogan: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  tag: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  h: { color: colors.text, fontSize: 15, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  statusText: { flex: 1 },
  dot: { width: 10, height: 10, borderRadius: radii.pill },
  rowLabel: { color: colors.textMuted, fontSize: 12 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: "600" },
  input: {
    backgroundColor: colors.elevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  actions: { flexDirection: "row", gap: spacing.md },
  btn: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.navy, fontSize: 15, fontWeight: "700" },
  btnGhostText: { color: colors.text },
  msg: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
