import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../theme";

/** Generic list row: [leading] title/subtitle [trailing] (settings rows, list
 *  items). The row auto-flips under RTL; text aligns to the leading edge. */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const inner = (
    <>
      {leading != null ? <View style={styles.side}>{leading}</View> : null}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {trailing != null ? <View style={styles.side}>{trailing}</View> : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={styles.row}>{inner}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, minHeight: 52 },
  pressed: { opacity: 0.6 },
  side: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 15, fontWeight: "600" },
  subtitle: { color: colors.textMuted, fontSize: 13 },
});
