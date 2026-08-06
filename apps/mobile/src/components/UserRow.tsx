import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PublicProfile } from "@swap/types";
import { colors, spacing } from "../theme";
import { Avatar } from "./ui/Avatar";

/** A person row: avatar + name/@username (tappable → their profile) + an optional
 *  trailing action (Follow/Unfollow, Unblock, …). Shared by the connections and
 *  blocked-users lists so their structure stays consistent. RTL-safe (row flips). */
export function UserRow({
  user,
  onPress,
  action,
}: {
  user: Pick<PublicProfile, "id" | "full_name" | "username" | "avatar_url">;
  onPress: () => void;
  action?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.person, pressed && styles.pressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={user.full_name}
      >
        <Avatar uri={user.avatar_url} name={user.full_name} size="md" />
        <View style={styles.names}>
          <Text style={styles.name} numberOfLines={1}>{user.full_name}</Text>
          <Text style={styles.username} numberOfLines={1}>@{user.username}</Text>
        </View>
      </Pressable>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  person: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  names: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 15, fontWeight: "700" },
  username: { color: colors.textMuted, fontSize: 13 },
  action: { flexShrink: 0 },
});
