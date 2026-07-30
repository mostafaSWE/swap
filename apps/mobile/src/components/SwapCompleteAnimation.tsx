import { useEffect, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Repeat2 } from "lucide-react-native";
import { t } from "../i18n";
import { colors, radii, spacing } from "../theme";
import { Icon } from "./ui";

/**
 * Native equivalent of the web's completion interstitial. It deliberately owns
 * the same 2.6-second lifecycle: a user can dismiss it early, then the caller
 * may open the optional rating prompt.
 */
export function SwapCompleteAnimation({ onDone }: { onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), 2600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onDone}>
      <Pressable
        style={styles.backdrop}
        onPress={onDone}
        accessibilityRole="button"
        accessibilityLabel={t("proposal.completeTitle")}
      >
        <View style={styles.content} pointerEvents="none">
          <View style={styles.ring}>
            <View style={styles.iconCircle}>
              <Icon icon={Repeat2} size={48} color={colors.white} />
            </View>
          </View>
          <Text style={styles.title}>{t("proposal.completeTitle")}</Text>
          <Text style={styles.body}>{t("proposal.completeBody")}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: "rgba(10,14,26,0.84)",
  },
  content: { alignItems: "center", gap: spacing.md, maxWidth: 320 },
  ring: {
    width: 112,
    height: 112,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(92, 200, 132, 0.34)",
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
  },
  title: { color: colors.white, fontSize: 24, fontWeight: "800", textAlign: "center" },
  body: { color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 21, textAlign: "center" },
});
