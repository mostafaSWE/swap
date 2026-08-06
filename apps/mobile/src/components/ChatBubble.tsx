import { StyleSheet, Text, View } from "react-native";
import { Check, CheckCheck } from "lucide-react-native";
import { colors, radii } from "../theme";
import { Icon } from "./ui/Icon";

/** A single chat message bubble (web `ChatBubble`). Own messages align to the
 *  trailing edge (green); others to the leading edge. `alignItems` is cross-axis,
 *  so `flex-end`/`flex-start` auto-flip under RTL. `time` is pre-formatted. Own
 *  bubbles show a sent (✓) / read (✓✓) receipt. */
export function ChatBubble({ body, time, isOwn, isRead }: { body: string; time?: string; isOwn: boolean; isRead?: boolean }) {
  return (
    <View style={[styles.row, { alignItems: isOwn ? "flex-end" : "flex-start" }]}>
      <View style={[styles.bubble, isOwn ? styles.own : styles.other]}>
        <Text style={[styles.body, isOwn ? styles.ownText : styles.otherText]}>{body}</Text>
        {time ? (
          <View style={styles.meta}>
            <Text style={[styles.time, isOwn ? styles.ownTime : styles.otherTime]}>{time}</Text>
            {isOwn ? (
              <Icon icon={isRead ? CheckCheck : Check} size={13} color={isRead ? colors.white : "rgba(255,255,255,0.7)"} />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%" },
  bubble: { maxWidth: "78%", borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 8 },
  own: { backgroundColor: colors.green },
  other: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  body: { fontSize: 14, lineHeight: 19 },
  ownText: { color: colors.white },
  otherText: { color: colors.text },
  meta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2, alignSelf: "flex-end" },
  time: { fontSize: 10 },
  ownTime: { color: "rgba(255,255,255,0.7)" },
  otherTime: { color: colors.textMuted },
});
