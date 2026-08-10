import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { colors, radii, spacing } from "../../theme";
import { IconButton } from "./IconButton";

/** Bottom sheet (web `Sheet`) on RN core Modal — backdrop tap + slide-up.
 *  Header is `flexDirection:row` w/ space-between → title/close auto-swap in RTL.
 *  (A gesture-driven @gorhom sheet is a later polish.) */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  closeLabel = "Close",
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  closeLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      {/* Anchor the sheet to the bottom with the backdrop as an absolute fill BEHIND
          it — not a flex:1 sibling. A flex sibling under-sizes the sheet so its last
          child overflows below the touch box (visible but untappable, and often into
          the gesture-nav zone). This layout sizes the sheet to its content exactly. */}
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={closeLabel} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing["2xl"] }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {title ?? ""}
            </Text>
            <IconButton icon={X} onPress={onClose} size={22} color={colors.textMuted} accessibilityLabel={closeLabel} />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: "85%",
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.md },
  title: { color: colors.text, fontSize: 16, fontWeight: "700", flex: 1 },
});
