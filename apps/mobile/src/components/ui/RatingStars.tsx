import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";

const SIZES = { sm: 14, md: 20, lg: 28 } as const;

/** 1–5 star control (web `RatingStars`). Read-only, or interactive when
 *  `onChange` is given (touch — keyboard nav is web-only). Uses ★/☆ glyphs so no
 *  icon library is needed. The `row` auto-flips under RTL (intended): filled
 *  stars fill from the leading edge — the right in Arabic — so the rating reads
 *  as a quantity growing outward from where the eye starts. */
export function RatingStars({
  value,
  onChange,
  size = "md",
  label,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: keyof typeof SIZES;
  label?: string;
}) {
  const px = SIZES[size];
  const interactive = !!onChange;
  return (
    <View
      style={styles.row}
      accessibilityRole={interactive ? "adjustable" : "image"}
      accessibilityLabel={label}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const glyph = (
          <Text style={[{ fontSize: px }, filled ? styles.filled : styles.empty]}>
            {filled ? "★" : "☆"}
          </Text>
        );
        return interactive ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={4} accessibilityLabel={`${n}`}>
            {glyph}
          </Pressable>
        ) : (
          <View key={n}>{glyph}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2 },
  filled: { color: colors.warning },
  empty: { color: colors.textFaint },
});
