import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../../theme";

export type Segment<T extends string> = { value: T; label: string };

/** iOS-style segmented control (web `SegmentedControl` / tab filters). The track
 *  is `flexDirection:"row"`, so the segments auto-order under RTL. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.track}>
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            onPress={() => onChange(s.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.active]}
          >
            <Text style={[styles.label, active && styles.activeLabel]} numberOfLines={1}>
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", backgroundColor: colors.elevated, borderRadius: radii.md, padding: 3, gap: 3 },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.sm, alignItems: "center", justifyContent: "center" },
  active: { backgroundColor: colors.surface },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  activeLabel: { color: colors.text },
});
