import { StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { Skeleton } from "./ui/Skeleton";

/** Loading placeholder shaped like a `ListingCard` (artwork block + two title
 *  lines + a meta line). Render a few of these instead of a bare spinner so the
 *  list keeps its layout while data loads. */
export function ListingCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={150} radius={0} />
      <View style={styles.body}>
        <Skeleton width="85%" height={15} />
        <Skeleton width="55%" height={15} />
        <View style={styles.meta}>
          <Skeleton width={64} height={20} radius={radii.pill} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  body: { padding: spacing.md, gap: spacing.sm },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 2 },
});
