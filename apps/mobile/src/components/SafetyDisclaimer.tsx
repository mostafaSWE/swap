import { StyleSheet, Text, View } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { colors, radii, spacing } from "../theme";
import { Icon } from "./ui/Icon";

const AMBER_BG = "rgba(245,158,11,0.12)";
const AMBER_BORDER = "rgba(245,158,11,0.35)";

/** Amber safety/responsibility callout (web's warning card). Shared by the chat
 *  thread header and the propose-swap sheet — JustSwap only connects people; the
 *  agreement and handover are the users' responsibility. Leading-aligned icon
 *  flips under RTL. */
export function SafetyDisclaimer({ text }: { text: string }) {
  return (
    <View style={styles.card}>
      <Icon icon={ShieldAlert} size={16} color={colors.warning} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: AMBER_BG,
    borderWidth: 1,
    borderColor: AMBER_BORDER,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  text: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 18 },
});
