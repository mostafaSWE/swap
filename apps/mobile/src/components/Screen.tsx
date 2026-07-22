import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";

/** Themed screen wrapper: dark canvas + safe-area-aware padding. */
export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const pad = { paddingBottom: insets.bottom + spacing.lg };
  if (scroll) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={[styles.content, pad, style]}>
        {children}
      </ScrollView>
    );
  }
  return <View style={[styles.root, styles.content, pad, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
});
