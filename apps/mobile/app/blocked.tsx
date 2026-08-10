import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ban, Undo2 } from "lucide-react-native";
import type { PublicProfile } from "@swap/types";
import { getBlockedUsers } from "@swap/api";
import { supabase } from "../src/lib/supabase";
import { api } from "../src/lib/api";
import { t } from "../src/i18n";
import { colors, spacing } from "../src/theme";
import { Avatar, Button, Icon } from "../src/components/ui";
import { EmptyState } from "../src/components/EmptyState";
import { Screen } from "../src/components/Screen";
import { SignInGate } from "../src/components/SignInGate";

/** Blocked-users management (web `/settings/blocked`): list + per-row Unblock. */
export default function BlockedScreen() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null | undefined>(undefined); // undefined = resolving
  const [users, setUsers] = useState<PublicProfile[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (uid === undefined) return;
    if (!uid) {
      setUsers([]);
      return;
    }
    let active = true;
    getBlockedUsers(supabase, uid).then((r) => active && setUsers(r)).catch(() => active && setUsers([]));
    return () => {
      active = false;
    };
  }, [uid]);

  async function unblock(userId: string) {
    if (busyId) return;
    setBusyId(userId);
    try {
      await api.unblock(userId);
      setUsers((current) => (current ?? []).filter((u) => u.id !== userId));
    } catch {
      // leave the row in place on failure
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t("block.blockedTitle") }} />
      {uid === undefined || users === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.green} /></View>
      ) : !uid ? (
        <SignInGate icon={Ban} title={t("mobile.profile.signInTitle")} body={t("mobile.profile.signInPrompt")} next="/blocked" />
      ) : users.length === 0 ? (
        <Screen><EmptyState icon={<Icon icon={Ban} size={26} color={colors.green} />} title={t("block.blockedEmpty")} /></Screen>
      ) : (
        <ScrollView style={styles.root} contentContainerStyle={styles.content}>
          {users.map((u) => (
            <View key={u.id} style={styles.row}>
              <Pressable
                style={styles.person}
                onPress={() => router.push({ pathname: "/users/[username]", params: { username: u.username } })}
                accessibilityRole="button"
                accessibilityLabel={u.full_name}
              >
                <Avatar uri={u.avatar_url} name={u.full_name} size="md" />
                <View style={styles.names}>
                  <Text style={styles.name} numberOfLines={1}>{u.full_name}</Text>
                  <Text style={styles.username} numberOfLines={1}>@{u.username}</Text>
                </View>
              </Pressable>
              <Button
                variant="secondary"
                label={t("block.unblock")}
                onPress={() => unblock(u.id)}
                loading={busyId === u.id}
                leftIcon={<Icon icon={Undo2} size={16} color={colors.text} mirror />}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  person: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  names: { flex: 1 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  username: { color: colors.textMuted, fontSize: 13 },
});
