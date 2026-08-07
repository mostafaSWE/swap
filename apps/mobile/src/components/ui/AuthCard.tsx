import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "../../theme";

/**
 * Centered auth/account form container — the native counterpart of the web
 * AuthShell card (rounded-[24px] border bg-surface shadow-elevated). Uses a SOLID
 * surface (not translucent + backdrop-blur, which has no reliable Fabric
 * equivalent) with an elevation shadow. Constrained to a comfortable max width.
 */
export function AuthCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    // Elevation — Android + iOS.
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
});
