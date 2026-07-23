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
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={closeLabel} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title ?? ""}
          </Text>
          <IconButton icon={X} onPress={onClose} size={22} color={colors.textMuted} accessibilityLabel={closeLabel} />
        </View>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
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
