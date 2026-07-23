import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bell } from "lucide-react-native";
import { colors, radii } from "../theme";
import { Icon } from "./ui/Icon";

/** Bell with an unread-count badge (web `NotificationBell` trigger). The panel
 *  itself is an M3 screen; this is just the header affordance. The badge uses a
 *  logical `end` inset so it sits on the trailing-top corner in both directions. */
export function NotificationBell({ count = 0, onPress }: { count?: number; onPress?: () => void }) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
        hitSlop={8}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <Icon icon={Bell} size={24} color={colors.text} />
      </Pressable>
      {count > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{count > 9 ? "9+" : String(count)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  btn: { padding: 6, borderRadius: radii.pill },
  pressed: { opacity: 0.6 },
  badge: {
    position: "absolute",
    top: 2,
    end: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.navy, fontSize: 10, fontWeight: "800" },
});
