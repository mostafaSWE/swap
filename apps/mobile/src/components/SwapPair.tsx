import { StyleSheet, Text, View } from "react-native";
import { ArrowLeftRight, Repeat2 } from "lucide-react-native";
import { colors, radii } from "../theme";
import { t } from "../i18n";
import { CategoryIcon } from "./ui/CategoryIcon";
import { Icon } from "./ui/Icon";

/**
 * SwapPair — JustSwap's signature barter visual: [ what the owner GIVES ] ⇄
 * [ what they WANT ]. Port of web `SwapPair`. The swap arrow is directional, so
 * it `mirror`s under RTL; the row itself auto-flips so GIVES stays on the
 * leading edge in both directions.
 */
type Size = "sm" | "md" | "lg";
const DIMS: Record<Size, { box: number; icon: number; label: number; arrow: number }> = {
  sm: { box: 36, icon: 16, label: 10, arrow: 26 },
  md: { box: 48, icon: 24, label: 11, arrow: 32 },
  lg: { box: 76, icon: 32, label: 12, arrow: 38 },
};

export function SwapPair({
  categoryIcon,
  size = "md",
}: {
  categoryIcon?: string | null;
  size?: Size;
}) {
  const d = DIMS[size];
  return (
    <View style={styles.row}>
      <Cell label={t("swap.gives")} labelSize={d.label}>
        <View style={[styles.box, { width: d.box, height: d.box, backgroundColor: colors.elevated, borderColor: colors.borderStrong }]}>
          <CategoryIcon icon={categoryIcon ?? "other"} size={d.icon} color={colors.text} />
        </View>
      </Cell>

      <View style={styles.connector}>
        <View style={[styles.arrow, { width: d.arrow, height: d.arrow, borderRadius: d.arrow / 2 }]}>
          <Icon icon={ArrowLeftRight} size={Math.round(d.arrow * 0.55)} color={colors.white} mirror />
        </View>
      </View>

      <Cell label={t("swap.wants")} labelSize={d.label} accent>
        <View style={[styles.box, { width: d.box, height: d.box, backgroundColor: colors.greenLight, borderColor: colors.green }]}>
          <Icon icon={Repeat2} size={d.icon} color={colors.green} />
        </View>
      </Cell>
    </View>
  );
}

function Cell({
  label,
  labelSize,
  accent,
  children,
}: {
  label: string;
  labelSize: number;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.cell}>
      {children}
      <Text
        style={[styles.label, { fontSize: labelSize, color: accent ? colors.green : colors.textMuted }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cell: { flex: 1, minWidth: 0, alignItems: "center", gap: 4 },
  box: { alignItems: "center", justifyContent: "center", borderRadius: radii.lg, borderWidth: 1 },
  connector: { alignSelf: "stretch", alignItems: "center", justifyContent: "center", paddingTop: 8 },
  arrow: { alignItems: "center", justifyContent: "center", backgroundColor: colors.green },
  label: { fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, maxWidth: "100%" },
});
