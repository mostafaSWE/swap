import { StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../../theme";

const TONES = [colors.danger, colors.danger, colors.warning, colors.info, colors.success];

/** Strength bar 0–4 (web `StrengthMeter`, e.g. password strength). Bars fill
 *  from the leading edge (the row auto-flips under RTL). */
export function StrengthMeter({ score, label }: { score: number; label?: string }) {
  const s = Math.max(0, Math.min(4, Math.round(score)));
  const tone = TONES[s];
  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i < s ? tone : colors.elevated }]} />
        ))}
      </View>
      {label ? <Text style={[styles.label, { color: tone }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  bars: { flexDirection: "row", gap: 4 },
  bar: { flex: 1, height: 5, borderRadius: radii.pill },
  label: { fontSize: 12, fontWeight: "600" },
});
