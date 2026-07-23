import { StyleSheet, Text, View } from "react-native";
import { ArrowLeftRight } from "lucide-react-native";
import { colors, radii, spacing } from "../theme";
import { t } from "../i18n";
import { CategoryIcon } from "./ui/CategoryIcon";
import { Icon } from "./ui/Icon";

/**
 * The focal "what the owner wants in exchange" panel on a listing (web
 * `WantedCard`). Accent-framed. Falls back to honest open-to-offers states when
 * the owner didn't name a specific item.
 */
export function WantedCard({ wanted, categoryIcon }: { wanted: string; categoryIcon: string }) {
  const trimmed = wanted.trim();
  const text = trimmed === "__any__" ? t("listing.openToAnyExchange") : trimmed || t("listing.openToOffers");

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.arrow}>
          <Icon icon={ArrowLeftRight} size={16} color={colors.white} mirror />
        </View>
        <Text style={styles.eyebrow}>{t("listing.wantedExchange")}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.iconBox}>
          <CategoryIcon icon={categoryIcon} size={28} color={colors.green} />
        </View>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const ACCENT_BORDER = "rgba(24,182,106,0.32)";

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: 1, borderColor: ACCENT_BORDER, backgroundColor: colors.greenLight, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  arrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.green, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  body: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  iconBox: { width: 56, height: 56, borderRadius: radii.lg, borderWidth: 1, borderColor: ACCENT_BORDER, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "600", lineHeight: 22 },
});
