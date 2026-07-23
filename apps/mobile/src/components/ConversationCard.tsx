import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";
import { Avatar } from "./ui/Avatar";
import { Badge, PROPOSAL_STATUS_TONE } from "./ui/Badge";

/** Row in the conversations list (web `ConversationCard`). `time` pre-formatted. */
export function ConversationCard({
  name,
  uri,
  lastMessage,
  time,
  unreadCount = 0,
  proposalStatus,
  proposalLabel,
  onPress,
}: {
  name: string;
  uri?: string | null;
  lastMessage?: string | null;
  time?: string;
  unreadCount?: number;
  proposalStatus?: string;
  proposalLabel?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityRole="button">
      <Avatar uri={uri} name={name} size="md" />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </View>
        <View style={styles.bottomRow}>
          {proposalStatus ? (
            <Badge label={proposalLabel ?? proposalStatus} tone={PROPOSAL_STATUS_TONE[proposalStatus] ?? "neutral"} />
          ) : null}
          <Text style={styles.preview} numberOfLines={1}>{lastMessage ?? "—"}</Text>
        </View>
      </View>
      {unreadCount > 0 ? (
        <View style={styles.unread}>
          <Text style={styles.unreadText}>{unreadCount > 9 ? "9+" : String(unreadCount)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  pressed: { opacity: 0.6 },
  body: { flex: 1, gap: 3 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  name: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "700" },
  time: { color: colors.textMuted, fontSize: 12 },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  preview: { flex: 1, color: colors.textMuted, fontSize: 14 },
  unread: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { color: colors.navy, fontSize: 12, fontWeight: "800" },
});
