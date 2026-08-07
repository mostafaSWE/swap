import { StyleSheet, Text, View } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { colors, radii, spacing } from "../theme";
import { Icon } from "./ui/Icon";

const AMBER_BG = "rgba(245,158,11,0.12)";
const AMBER_BORDER = "rgba(245,158,11,0.35)";
const AMBER_TEXT = "#B45309";

/**
 * Amber safety/responsibility callout (web's warning card). Two shapes, matching
 * web's `variant` API:
 *  - compact (default): a single leading-icon + `text` line — used by the chat
 *    thread header and the propose-swap sheet.
 *  - full: pass `title` + `points` to render a heading + bulleted list (the Safety
 *    screen's platform notice). JustSwap only connects people; the agreement and
 *    handover are the users' responsibility. Leading-aligned icon flips under RTL.
 */
export function SafetyDisclaimer({ text, title, points }: { text?: string; title?: string; points?: string[] }) {
  if (points && points.length) {
    return (
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Icon icon={ShieldAlert} size={18} color={colors.warning} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
        <View style={styles.points}>
          {points.map((point, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Icon icon={ShieldAlert} size={16} color={colors.warning} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const cardBase = {
  backgroundColor: AMBER_BG,
  borderWidth: 1,
  borderColor: AMBER_BORDER,
  borderRadius: radii.md,
  padding: spacing.md,
} as const;

const styles = StyleSheet.create({
  row: { ...cardBase, flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  text: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 18 },
  card: { ...cardBase, gap: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, color: AMBER_TEXT, fontSize: 15, fontWeight: "800" },
  points: { gap: 4 },
  bulletRow: { flexDirection: "row", gap: spacing.sm, paddingStart: spacing.xs },
  bullet: { color: colors.warning, fontSize: 13, lineHeight: 20 },
  pointText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 20 },
});
