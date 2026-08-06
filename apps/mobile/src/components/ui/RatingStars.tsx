import { Pressable, StyleSheet, View } from "react-native";
import { Star } from "lucide-react-native";
import { colors } from "../../theme";
import { Icon } from "./Icon";

const SIZES = { sm: 14, md: 20, lg: 28 } as const;
const STAR_FILL = "#FBBF24"; // amber-400, the conventional rating gold

/** 1–5 star control (web `RatingStars`). Read-only, or interactive when
 *  `onChange` is given (touch — keyboard nav is web-only). Filled stars fill from
 *  the leading edge (the right in Arabic) so the rating reads as a quantity
 *  growing outward from where the eye starts. */
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
        const star = (
          <Icon
            icon={Star}
            size={px}
            color={filled ? STAR_FILL : colors.textFaint}
            fill={filled ? STAR_FILL : "transparent"}
          />
        );
        return interactive ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={4} accessibilityLabel={`${n}`}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2 },
});
