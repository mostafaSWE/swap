import { StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../theme";
import { Skeleton } from "./ui/Skeleton";

/** Loading placeholder shaped like a `ConversationCard` (avatar + name/preview lines). */
export function ConversationCardSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={48} height={48} radius={radii.pill} />
      <View style={styles.body}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="80%" height={13} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  body: { flex: 1, gap: spacing.sm },
});
